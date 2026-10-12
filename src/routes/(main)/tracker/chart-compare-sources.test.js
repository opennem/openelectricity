import { describe, expect, it } from 'vitest';
import { compareRows } from '$lib/components/charts/card/compare/chart-compare.js';
import { compareBuckets } from '$lib/components/charts/card/compare/snapshot-sources.js';
import {
	formatRankPlace,
	regionCompareSource,
	timelineCompareSource
} from './chart-compare-sources.js';

const a = Date.parse('2026-08-01T00:00:00Z');
const b = a + 86_400_000;

/** @param {Array<Record<string, any>>} data @param {string[]} seriesNames */
const snapshot = (data, seriesNames) =>
	/** @type {import('./types.js').GenerationSnapshot} */ ({
		queryKey: 'q',
		start: a,
		end: b,
		data,
		nativeData: [],
		seriesNames,
		seriesLabels: { coal: 'Coal', battery_charging: 'Battery (Charging)' },
		seriesColours: { coal: '#111' }
	});

const context = {
	metric: 'power',
	hidden: /** @type {string[]} */ ([]),
	loadIds: ['battery_charging'],
	prefix: /** @type {SiPrefix} */ ('M'),
	held: {},
	region: 'nsw1',
	zone: '+10:00',
	interval: '5m',
	formatTime: String
};

describe('timeline compare sources', () => {
	const generation = snapshot(
		[
			{ time: a, coal: 100, battery_charging: -5 },
			{ time: b, coal: 80, battery_charging: -15 },
			{ time: b + 1, coal: 80, _bandClose: true }
		],
		['battery_charging', 'coal']
	);
	it('offers displayed buckets only, never a synthetic band close', () => {
		expect(compareBuckets(generation).map((row) => row.time)).toEqual([a, b]);
	});
	it('lists a stack top first, without hidden series, loads filed as loads', () => {
		const source = timelineCompareSource('generation', generation, context);
		expect(source?.kind).toBe('composition');
		expect(source?.unit).toBe('MW');
		expect(source?.series.map((series) => [series.id, series.isLoad])).toEqual([
			['coal', false],
			['battery_charging', true]
		]);
		const hidden = timelineCompareSource('generation', generation, {
			...context,
			hidden: ['coal']
		});
		expect(hidden?.series.map((series) => series.id)).toEqual(['battery_charging']);
		expect(compareRows(source, { a, b })[0]).toMatchObject({ a: 100, b: 80, delta: -20 });
	});
	it('reads dates held from before a pan', () => {
		const held = { [a - 3_600_000]: { time: a - 3_600_000, coal: 50 } };
		const source = timelineCompareSource('generation', generation, { ...context, held });
		expect(source?.has?.(a - 3_600_000)).toBe(true);
		expect(source?.value(a - 3_600_000, 'coal')).toBe(50);
		expect(source?.times).not.toContain(a - 3_600_000);
	});
	it('derives intensity from its components, with the window ratio as the reference', () => {
		const emissions = snapshot(
			[
				{ time: a, emissions: 50, energy_mwh: 100 },
				{ time: b, emissions: 150, energy_mwh: 100 }
			],
			['emissions', 'energy_mwh']
		);
		const source = timelineCompareSource('emissions', emissions, {
			...context,
			metric: 'emissions_intensity'
		});
		expect(source?.kind).toBe('single');
		expect(source?.value(a, 'value')).toBe(500);
		expect(source?.value(b, 'value')).toBe(1500);
		expect(source?.window).toMatchObject({ min: 500, max: 1500, reference: 1000 });
		expect(source?.window?.referenceLabel).toBe('Window');
	});
	it('reads spot price as one line, referenced to its mean', () => {
		const price = snapshot(
			[
				{ time: a, price: 50 },
				{ time: b, price: 150 }
			],
			['price']
		);
		const source = timelineCompareSource('market', price, { ...context, metric: 'price' });
		expect(source?.kind).toBe('single');
		expect(source?.window).toMatchObject({ reference: 100, referenceLabel: 'Mean' });
		expect(source?.format(85.3)).toBe('85.30');
	});
	it('is null until the chart has data', () => {
		expect(timelineCompareSource('generation', null, context)).toBeNull();
	});
});

describe('region compare sources', () => {
	const jan = Date.UTC(2010, 0, 1);
	const feb = Date.UTC(2010, 1, 1);
	/** @param {number} time @param {number} renewables @param {number} demand */
	const row = (time, renewables, demand) => ({ time, renewables, demand_gross: demand });
	const data = {
		nsw1: [row(jan, 10, 100), row(feb, 20, 100)],
		vic1: [row(jan, 30, 100), row(feb, 25, 100)],
		_all: [row(jan, 40, 200), row(feb, 45, 200)]
	};
	const input = {
		data,
		regions: ['nsw1', 'vic1'],
		metric: 'renewables_share',
		basis: /** @type {const} */ ('demand'),
		interval: '1M',
		months: 1
	};
	it('changes shares in percentage points', () => {
		const source = regionCompareSource(input);
		expect(source.deltaMode).toBe('points');
		expect(source.times).toEqual([jan, feb]);
		expect(compareRows(source, { a: jan, b: feb }).map((entry) => entry.delta)).toEqual([10, -5]);
		expect(source.formatDelta(10)).toBe('+10.0');
	});
	it('ranks the states and places the NEM among them as a dashed reference', () => {
		const source = regionCompareSource({ ...input, benchmarks: ['_all'], rank: true });
		expect(source.deltaMode).toBe('rank');
		const rows = compareRows(source, { a: jan, b: feb });
		expect(rows.map((entry) => [entry.id, entry.a, entry.b, entry.delta])).toEqual([
			['nsw1', 2, 2, 0],
			['vic1', 1, 1, 0],
			['_all', 1.5, 1.5, 0]
		]);
		expect(rows[2].dashed).toBe(true);
		expect(source.format(1.5)).toBe('#1–2');
	});
	it('reads places between and beyond the ranks as the tooltip does', () => {
		expect(formatRankPlace(2, 4)).toBe('#2');
		expect(formatRankPlace(2.5, 4)).toBe('#2–3');
		expect(formatRankPlace(0.5, 4)).toBe('above #1');
		expect(formatRankPlace(4.5, 4)).toBe('below #4');
		expect(formatRankPlace(null, 4)).toBe('—');
	});
});
