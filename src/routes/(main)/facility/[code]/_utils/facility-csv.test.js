import { describe, it, expect } from 'vitest';
import {
	formatNetworkTimestamp,
	generationCsv,
	energyCsv,
	marketValueCsv,
	emissionsCsv,
	chartDownloadItems,
	buildChartCsv
} from './facility-csv.js';

// 2026-07-01T04:30:00Z → 14:30 AEST / 12:30 AWST
const T0 = Date.UTC(2026, 6, 1, 4, 30, 0);
const T1 = T0 + 30 * 60 * 1000;

const facility = {
	units: [
		{ code: 'BW_01', code_display: 'BW01', fueltech_id: 'coal_black' },
		{ code: 'BW_02', fueltech_id: 'coal_black' }
	]
};

describe('formatNetworkTimestamp', () => {
	it('formats in NEM local time with the offset appended', () => {
		expect(formatNetworkTimestamp(T0, '+10:00')).toBe('2026-07-01 14:30:00+10:00');
	});

	it('formats in WEM local time with the offset appended', () => {
		expect(formatNetworkTimestamp(T0, '+08:00')).toBe('2026-07-01 12:30:00+08:00');
	});
});

describe('generationCsv', () => {
	const intervalData = {
		data: [
			{ time: T0, power_BW_01: 660.5, power_BW_02: -12.25 },
			{ time: T1, power_BW_01: null, power_BW_02: 640 }
		],
		seriesNames: ['power_BW_01', 'power_BW_02'],
		seriesLabels: {
			power_BW_01: 'BW01 (Coal (Black))',
			power_BW_02: 'BW_02 (Coal (Black))'
		}
	};

	it('uses the chart labels with the metric unit, quoting where needed', () => {
		const csv = generationCsv({ intervalData, metric: 'power', timeZone: '+10:00' });
		const lines = csv?.split('\n') ?? [];
		expect(lines[0]).toBe('date,BW01 (Coal (Black)) (MW),BW_02 (Coal (Black)) (MW)');
		expect(lines[1]).toBe('2026-07-01 14:30:00+10:00,660.5,-12.25');
	});

	it('writes nulls as empty cells, never zeros', () => {
		const csv = generationCsv({ intervalData, metric: 'power', timeZone: '+10:00' });
		expect(csv?.split('\n')[2]).toBe('2026-07-01 15:00:00+10:00,,640');
	});

	it('labels energy-metric rows in MWh', () => {
		const csv = generationCsv({
			intervalData: {
				data: [{ time: T0, energy_BW_01: 330.25 }],
				seriesNames: ['energy_BW_01'],
				seriesLabels: { energy_BW_01: 'BW01 (Coal (Black))' }
			},
			metric: 'energy',
			timeZone: '+10:00'
		});
		expect(csv?.split('\n')[0]).toBe('date,BW01 (Coal (Black)) (MWh)');
	});

	it('returns null when there is nothing to export', () => {
		expect(generationCsv({ intervalData: null, metric: 'power', timeZone: '+10:00' })).toBeNull();
		expect(
			generationCsv({
				intervalData: { data: [], seriesNames: ['power_BW_01'], seriesLabels: {} },
				metric: 'power',
				timeZone: '+10:00'
			})
		).toBeNull();
	});
});

describe('energyCsv / marketValueCsv / emissionsCsv', () => {
	it('rebuilds legend labels from facility units, stripping only the known prefix', () => {
		const csv = energyCsv({
			summaryData: {
				energyData: [{ time: T0, energy_BW_01: 330, energy_BW_02: 320 }],
				energySeriesNames: ['energy_BW_01', 'energy_BW_02']
			},
			facility,
			timeZone: '+10:00'
		});
		const lines = csv?.split('\n') ?? [];
		// BW_01 has a display code; BW_02 (underscored, no display code) keeps its code.
		expect(lines[0]).toBe('date,BW01 (Coal (Black)) (MWh),BW_02 (Coal (Black)) (MWh)');
		expect(lines[1]).toBe('2026-07-01 14:30:00+10:00,330,320');
	});

	it('labels market value in dollars', () => {
		const csv = marketValueCsv({
			summaryData: {
				mvData: [{ time: T0, market_value_BW_01: 15000 }],
				mvSeriesNames: ['market_value_BW_01']
			},
			facility,
			timeZone: '+10:00'
		});
		expect(csv?.split('\n')[0]).toBe('date,BW01 (Coal (Black)) ($)');
	});

	it('labels emissions in tCO₂e', () => {
		const csv = emissionsCsv({
			emissionsData: {
				rows: [{ time: T0, emissions_BW_01: 580.5 }],
				seriesNames: ['emissions_BW_01']
			},
			facility,
			timeZone: '+10:00'
		});
		expect(csv?.split('\n')[0]).toBe('date,BW01 (Coal (Black)) (tCO₂e)');
	});

	it('returns null while the provider data has not arrived', () => {
		expect(energyCsv({ summaryData: null, facility, timeZone: '+10:00' })).toBeNull();
		expect(marketValueCsv({ summaryData: null, facility, timeZone: '+10:00' })).toBeNull();
		expect(emissionsCsv({ emissionsData: null, facility, timeZone: '+10:00' })).toBeNull();
	});
});

describe('chartDownloadItems', () => {
	it('offers emissions only when enabled', () => {
		expect(chartDownloadItems().map((i) => i.key)).toEqual([
			'generation',
			'energy',
			'market-value'
		]);
		expect(chartDownloadItems({ showEmissions: true }).map((i) => i.key)).toContain('emissions');
	});
});

describe('buildChartCsv', () => {
	it('dispatches each catalogue key to its builder', () => {
		const ctx = {
			intervalData: {
				data: [{ time: T0, power_BW_01: 660 }],
				seriesNames: ['power_BW_01'],
				seriesLabels: { power_BW_01: 'BW01 (Coal (Black))' }
			},
			summaryData: {
				energyData: [{ time: T0, energy_BW_01: 330 }],
				energySeriesNames: ['energy_BW_01'],
				mvData: [{ time: T0, market_value_BW_01: 15000 }],
				mvSeriesNames: ['market_value_BW_01']
			},
			emissionsData: {
				rows: [{ time: T0, emissions_BW_01: 580 }],
				seriesNames: ['emissions_BW_01']
			},
			facility,
			metric: 'power',
			timeZone: '+10:00'
		};
		expect(buildChartCsv('generation', ctx)).toContain('(MW)');
		expect(buildChartCsv('energy', ctx)).toContain('(MWh)');
		expect(buildChartCsv('market-value', ctx)).toContain('($)');
		expect(buildChartCsv('emissions', ctx)).toContain('(tCO₂e)');
		expect(buildChartCsv('unknown', ctx)).toBeNull();
	});
});
