import { describe, it, expect } from 'vitest';
import {
	getBasisMetric,
	combinedMetricsFor,
	buildCombinedMetricsUrl,
	rewriteSeriesPrefix,
	sumSeries,
	buildEnergyMap,
	toEnergySeriesRows,
	createBasisColour
} from './energy-basis.js';

const TZ = 'Australia/Brisbane';

describe('getBasisMetric', () => {
	it('treats only the 5m grain as power (the 30m display fetches at 5m)', () => {
		expect(getBasisMetric('5m')).toBe('power');
	});

	it('treats every daily-or-coarser native interval as energy', () => {
		for (const i of ['1h', '1d', '7d', '1M', '3M', '1y']) {
			expect(getBasisMetric(i)).toBe('energy');
		}
	});
});

describe('combinedMetricsFor', () => {
	it('builds the shared combined query string', () => {
		expect(combinedMetricsFor('energy')).toBe('energy,market_value,emissions');
		expect(combinedMetricsFor('power')).toBe('power,market_value,emissions');
	});
});

describe('buildCombinedMetricsUrl', () => {
	it('sets the combined metric on the facility power endpoint, keeping other params', () => {
		const build = buildCombinedMetricsUrl('ABC', 'energy,market_value,emissions');
		const params = new URLSearchParams({
			network_id: 'NEM',
			interval: '1M',
			metric: 'energy',
			date_start: '2026-01-01T00:00:00',
			date_end: '2026-02-01T00:00:00'
		});
		const url = build(params);
		expect(url.startsWith('/api/facilities/ABC/power?')).toBe(true);
		const parsed = new URL(url, 'http://localhost');
		expect(parsed.searchParams.get('metric')).toBe('energy,market_value,emissions');
		expect(parsed.searchParams.get('interval')).toBe('1M');
		expect(parsed.searchParams.get('network_id')).toBe('NEM');
	});

	it('produces identical URLs for the same facility + combined metric (dedup key)', () => {
		const a = buildCombinedMetricsUrl(
			'F1',
			'energy,market_value,emissions'
		)(new URLSearchParams({ interval: '1M', metric: 'energy' }));
		const b = buildCombinedMetricsUrl(
			'F1',
			'energy,market_value,emissions'
		)(new URLSearchParams({ interval: '1M', metric: 'market_value' }));
		expect(a).toBe(b);
	});
});

describe('rewriteSeriesPrefix', () => {
	it('rewrites power_ IDs to the target metric prefix', () => {
		expect(rewriteSeriesPrefix(['power_U1', 'power_U2'], 'energy')).toEqual([
			'energy_U1',
			'energy_U2'
		]);
	});

	it('is a no-op for power → power', () => {
		expect(rewriteSeriesPrefix(['power_U1'], 'power')).toEqual(['power_U1']);
	});

	it('only rewrites the leading prefix', () => {
		expect(rewriteSeriesPrefix(['power_power_x'], 'energy')).toEqual(['energy_power_x']);
	});
});

describe('sumSeries', () => {
	it('sums finite numbers and ignores null/undefined/NaN', () => {
		const row = { a: 10, b: 5, c: null, d: undefined, e: NaN, f: 'x' };
		expect(sumSeries(row, ['a', 'b', 'c', 'd', 'e', 'f'])).toBe(15);
	});

	it('returns 0 when nothing is numeric', () => {
		expect(sumSeries({ a: null }, ['a', 'missing'])).toBe(0);
	});
});

describe('buildEnergyMap', () => {
	it('sums native energy rows as-is (MWh) for energy intervals', () => {
		const rows = [
			{ time: 1, energy_U1: 10, energy_U2: 5 },
			{ time: 2, energy_U1: 20, energy_U2: null }
		];
		const map = buildEnergyMap(rows, ['energy_U1', 'energy_U2'], {
			isEnergyInterval: true,
			displayInterval: '1M',
			ianaTimeZone: TZ
		});
		expect(map.get(1)).toBe(15);
		expect(map.get(2)).toBe(20);
	});

	it('converts MW → MWh via interval hours for the 30m power grain', () => {
		const rows = [{ time: 1, power_U1: 100, power_U2: 60 }];
		const map = buildEnergyMap(rows, ['power_U1', 'power_U2'], {
			isEnergyInterval: false,
			displayInterval: '30m',
			ianaTimeZone: TZ
		});
		// (100 + 60) MW × 0.5 h = 80 MWh
		expect(map.get(1)).toBe(80);
	});

	it('uses 5/60 h for the raw 5m grain', () => {
		const rows = [{ time: 1, power_U1: 120 }];
		const map = buildEnergyMap(rows, ['power_U1'], {
			isEnergyInterval: false,
			displayInterval: '5m',
			ianaTimeZone: TZ
		});
		expect(map.get(1)).toBeCloseTo(120 * (5 / 60), 9);
	});
});

describe('toEnergySeriesRows', () => {
	it('passes native energy rows through unchanged', () => {
		const rows = [{ time: 1, date: new Date(1), energy_U1: 12 }];
		const names = ['energy_U1'];
		const out = toEnergySeriesRows(rows, names, {
			isEnergyInterval: true,
			displayInterval: '1M',
			ianaTimeZone: TZ
		});
		expect(out.rows).toBe(rows);
		expect(out.seriesNames).toBe(names);
	});

	it('renames + scales power rows to energy_<unit> MWh', () => {
		const rows = [{ time: 1, date: new Date(1), power_U1: 100, power_U2: null }];
		const out = toEnergySeriesRows(rows, ['power_U1', 'power_U2'], {
			isEnergyInterval: false,
			displayInterval: '30m',
			ianaTimeZone: TZ
		});
		expect(out.seriesNames).toEqual(['energy_U1', 'energy_U2']);
		expect(out.rows[0].energy_U1).toBe(50); // 100 MW × 0.5 h
		expect(out.rows[0].energy_U2).toBeNull();
		expect(out.rows[0].time).toBe(1);
	});
});

describe('createBasisColour', () => {
	const unitColours = { U1: '#336699', U2: '#aabbcc' };
	const getFuelTechColor = () => '#000000';

	it('returns the base colour for generators', () => {
		const colour = createBasisColour({
			basisMetric: 'energy',
			unitColours,
			loadIds: [],
			getFuelTechColor
		});
		expect(colour('U1', 'coal_black')).toBe('#336699');
	});

	it('brightens load units (matched via the basis prefix)', () => {
		const colour = createBasisColour({
			basisMetric: 'energy',
			unitColours,
			loadIds: ['power_U1'], // analyzeUnits IDs, rewritten to energy_U1
			getFuelTechColor
		});
		const loadColour = colour('U1', 'battery_charging');
		expect(loadColour).not.toBe('#336699'); // brightened
		expect(colour('U2', 'coal_black')).toBe('#aabbcc'); // non-load unchanged
	});

	it('falls back to the fuel-tech colour when the unit has none', () => {
		const colour = createBasisColour({
			basisMetric: 'power',
			unitColours: {},
			loadIds: [],
			getFuelTechColor: () => '#123456'
		});
		expect(colour('UX', 'gas_ccgt')).toBe('#123456');
	});
});
