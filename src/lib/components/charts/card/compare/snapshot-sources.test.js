import { describe, expect, it } from 'vitest';
import { compareRows, compareTotals } from './chart-compare.js';
import {
	compareBuckets,
	componentSums,
	lineCompareSource,
	stackCompareSource
} from './snapshot-sources.js';

const a = Date.parse('2026-08-01T00:00:00Z');
const b = a + 1_800_000;

/** @param {Array<Record<string, any>>} data @param {string[]} names
 * @returns {import('../types.js').ChartSnapshot} */
const snapshot = (data, names) => ({
	data,
	seriesNames: names,
	seriesLabels: { U1: 'Unit 1', U2: 'Unit 2', BATT: 'Battery charging' },
	seriesColours: { U1: '#111', U2: '#222' },
	end: b
});

const base = {
	title: 'Generation comparison',
	unit: 'MW',
	baseUnit: 'MW',
	format: String,
	formatTime: String
};

describe('compareBuckets', () => {
	it('offers displayed rows within the window, never a band close or a later row', () => {
		const rows = [{ time: a }, { time: b }, { time: b + 1, _bandClose: true }, { time: b + 10 }];
		expect(compareBuckets(snapshot(rows, [])).map((row) => row.time)).toEqual([a, b]);
		expect(compareBuckets(null)).toEqual([]);
	});
});

describe('stackCompareSource', () => {
	const stack = snapshot(
		[
			{ time: a, U1: 100, U2: 50, BATT: -10 },
			{ time: b, U1: 120, U2: 30, BATT: -20 }
		],
		['BATT', 'U2', 'U1']
	);
	it('lists the visible series top of the stack first, loads read as consumption', () => {
		const source = stackCompareSource(stack, {
			...base,
			hidden: ['U2'],
			loadIds: ['BATT'],
			rowHeader: 'Unit'
		});
		expect(source?.kind).toBe('composition');
		expect(source?.rowHeader).toBe('Unit');
		expect(source?.series.map((series) => [series.id, series.label, !!series.isLoad])).toEqual([
			['U1', 'Unit 1', false],
			['BATT', 'Battery charging', true]
		]);
		const rows = compareRows(source, { a, b });
		// Charging −10 → −20 reads as 10 → 20: more consumption, a rise.
		expect(rows.map((row) => [row.a, row.b, row.delta])).toEqual([
			[100, 120, 20],
			[10, 20, 10]
		]);
		// The total stays net: sources less loads.
		expect(compareTotals(rows)).toMatchObject({ a: 90, b: 100, delta: 10 });
	});
	it('reads rows held from before a pan, outside the selectable times', () => {
		const earlier = a - 1_800_000;
		const source = stackCompareSource(stack, {
			...base,
			held: { [earlier]: { time: earlier, U1: 80 } }
		});
		expect(source?.times).toEqual([a, b]);
		expect(source?.has?.(earlier)).toBe(true);
		expect(source?.value(earlier, 'U1')).toBe(80);
	});
	it('reads a series without a reading in a drawn bucket as 0, a bucket never drawn as missing', () => {
		const solar = snapshot(
			[
				{ time: a, U1: 100, SOLAR: null },
				{ time: b, U1: 90, SOLAR: 40 }
			],
			['SOLAR', 'U1']
		);
		const source = stackCompareSource(solar, base);
		expect(source?.value(a, 'SOLAR')).toBe(0);
		expect(compareRows(source, { a, b }).find((row) => row.id === 'SOLAR')).toMatchObject({
			id: 'SOLAR',
			a: 0,
			b: 40,
			delta: 40
		});
		expect(compareTotals(compareRows(source, { a, b }))).toMatchObject({ a: 100, b: 130 });
		expect(source?.value(a - 1_800_000, 'SOLAR')).toBeNull();
	});
	it('is null until the chart reports', () => {
		expect(stackCompareSource(null, base)).toBeNull();
	});
});

describe('lineCompareSource', () => {
	it('compares one line as tiles over the window, referenced to its mean', () => {
		const line = snapshot(
			[
				{ time: a, price: 50 },
				{ time: b, price: 150 }
			],
			['price']
		);
		const source = lineCompareSource(line, { ...base, label: 'Price' });
		expect(source?.kind).toBe('single');
		expect(source?.series[0]).toMatchObject({ id: 'price', label: 'Price' });
		expect(source?.window).toEqual({ min: 50, max: 150, reference: 100, referenceLabel: 'Mean' });
	});
	it('derives a line from its components, referenced to the ratio of window sums', () => {
		const line = snapshot(
			[
				{ time: a, emissions: 50, energy: 100 },
				{ time: b, emissions: 150, energy: 300 }
			],
			['emissions', 'energy']
		);
		/** @param {Record<string, any>} row */
		const ratio = (row) => (row.energy ? (row.emissions * 1000) / row.energy : null);
		const source = lineCompareSource(line, {
			...base,
			series: ['value'],
			read: ratio,
			reference: (rows) => ratio(componentSums(rows, ['emissions', 'energy'])),
			referenceLabel: 'Window'
		});
		expect(source?.value(a, 'value')).toBe(500);
		expect(source?.window).toMatchObject({
			min: 500,
			max: 500,
			reference: 500,
			referenceLabel: 'Window'
		});
	});
	it('compares several independent lines as lines, with no window', () => {
		const lines = snapshot(
			[
				{ time: a, U1: 40, U2: 60 },
				{ time: b, U1: 45, U2: 55 }
			],
			['U1', 'U2']
		);
		const source = lineCompareSource(lines, base);
		expect(source?.kind).toBe('lines');
		expect(source?.series.map((series) => series.colour)).toEqual(['#111', '#222']);
		expect(source?.window).toBeNull();
	});
});
