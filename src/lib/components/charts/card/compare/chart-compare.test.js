import { describe, expect, it } from 'vitest';
import {
	compareDataset,
	compareRows,
	compareTotals,
	compareValues,
	defaultComparePair,
	deltaExtent,
	formatComparePercent,
	formatRankChange,
	formatSignedChange,
	nearestCompareTime,
	normaliseCardComparison,
	pickCompareTime,
	sortCompareRows,
	stepCompareTime,
	toggleCompareCard
} from './chart-compare.js';
import { datasetToCsv } from '../export-dataset.js';

const a = Date.parse('2026-08-01T00:00:00Z');
const b = a + 86_400_000;

/** @param {Partial<import('../types.js').CompareSource>} overrides
 * @returns {import('../types.js').CompareSource} */
function source(overrides = {}) {
	/** @type {Record<number, Record<string, number | null>>} */
	const rows = {
		[a]: { coal: 100, load: -40, wind: null },
		[b]: { coal: 0, load: -20, wind: 30 }
	};
	return {
		kind: 'composition',
		title: 'Generation comparison',
		rowHeader: 'Technology',
		times: [a, b],
		series: [
			{ id: 'coal', label: 'Coal', colour: '#000' },
			{ id: 'wind', label: 'Wind', colour: '#0a0' },
			{ id: 'load', label: 'Charging', colour: '#00a' }
		],
		value: (time, id) => rows[time]?.[id] ?? null,
		deltaMode: 'relative',
		unit: 'MW',
		baseUnit: 'MW',
		format: String,
		formatDelta: String,
		formatTime: String,
		...overrides
	};
}

describe('compareValues', () => {
	it.each([
		[100, 150, 50, 50],
		[100, 0, -100, -100],
		[-40, -20, 20, 50],
		[-40, -80, -40, -100],
		[0, 50, 50, null],
		[0, 0, 0, null],
		[null, 50, null, null],
		[100, undefined, null, null],
		[NaN, 50, null, null],
		[100, Infinity, null, null]
	])('compares %s to %s without losing signs or missingness', (first, second, delta, percent) => {
		expect(compareValues(first, second)).toMatchObject({ delta, percent });
	});
	it('reads shares in percentage points, with no percentage of a percentage', () => {
		expect(compareValues(20, 35, 'points')).toEqual({ a: 20, b: 35, delta: 15, percent: null });
	});
	it('reads floating-point noise as no change', () => {
		expect(compareValues(0.1 + 0.2, 0.3, 'points')).toMatchObject({ delta: 0 });
		expect(compareValues(135, 135.00000000001)).toMatchObject({ delta: 0, percent: 0 });
		expect(compareValues(135, 135.001).delta).toBeCloseTo(0.001);
	});
	it('reads ranks as places moved, climbing positive', () => {
		expect(compareValues(4, 2, 'rank')).toMatchObject({ delta: 2, percent: null });
		expect(compareValues(1, 3, 'rank')).toMatchObject({ delta: -2 });
		expect(compareValues(null, 3, 'rank').delta).toBeNull();
	});
});

describe('compareRows and totals', () => {
	it('keeps the source order and reads loads as consumption, like the fuel-tech table files them', () => {
		const rows = compareRows(source(), { a, b });
		expect(rows).toMatchObject([
			{ id: 'coal', a: 100, b: 0, delta: -100, percent: -100, isLoad: false, sign: 1 },
			{ id: 'wind', a: null, b: 30, delta: null, isLoad: false },
			// Charging −40 → −20 MW reads as 40 → 20: less consumption, a fall.
			{ id: 'load', a: 40, b: 20, delta: -20, percent: -50, isLoad: true, sign: -1 }
		]);
		const listed = source({
			series: [{ id: 'coal', label: 'Coal', colour: '#000', isLoad: true }]
		});
		expect(compareRows(listed, { a, b })[0].isLoad).toBe(true);
	});
	it('only reads loads as consumption in a composition', () => {
		expect(compareRows(source({ kind: 'lines' }), { a, b })[2].isLoad).toBe(false);
	});
	it('never snaps an unset or missing date to a neighbour', () => {
		expect(compareRows(source(), { a: null, b })[0]).toMatchObject({ a: null, b: 0, delta: null });
		expect(compareRows(source(), { a: a + 1, b })[0].a).toBeNull();
		expect(compareRows(null, { a, b })).toEqual([]);
	});
	it('totals the net (sources less loads), and leaves a side unknown when any row is missing there', () => {
		const rows = compareRows(source(), { a, b });
		expect(compareTotals(rows)).toMatchObject({ a: null, b: 10, delta: null, partial: true });
		const complete = rows.filter((row) => row.id !== 'wind');
		expect(compareTotals(complete)).toMatchObject({
			a: 60,
			b: -20,
			delta: -80,
			partial: false
		});
		expect(compareTotals([])).toMatchObject({ a: null, b: null, partial: false });
	});
	it('ranks series that start or stop between A and B by their rise from or fall to nothing', () => {
		const rows = compareRows(source(), { a, b });
		/** @param {string} id @param {number | null} first @param {number | null} second */
		const row = (id, first, second) => ({ ...rows[0], id, a: first, b: second, delta: null });
		const sorted = sortCompareRows(
			[
				{ ...rows[0], id: 'wind', a: 589, b: 1136, delta: 547 },
				row('solar', null, 1406),
				row('battery', null, 4.2),
				{ ...rows[0], id: 'coal', a: 14210, b: 13274, delta: -936 },
				row('retired', 120, null),
				row('none', null, null)
			],
			'change'
		);
		expect(sorted.map((entry) => entry.id)).toEqual([
			'solar',
			'wind',
			'battery',
			'retired',
			'coal',
			'none'
		]);
		// Their cells still read missing.
		expect(sorted[0].delta).toBeNull();
	});
	it('scales bars to the largest change and sorts from the largest rise to the largest fall', () => {
		const rows = compareRows(source(), { a, b });
		expect(deltaExtent(rows)).toBe(100);
		expect(sortCompareRows(rows, 'stack')).toBe(rows);
		// wind appears (null → 30, a rise of 30), load +20, coal −100
		expect(sortCompareRows(rows, 'change').map((row) => row.id)).toEqual(['wind', 'load', 'coal']);
		/** @param {string} id @param {number | null} delta */
		const row = (id, delta) => ({ ...rows[0], id, delta });
		const mixed = [row('a', -1002), row('b', 2118), row('c', 599), row('d', -458), row('e', 1725)];
		expect(sortCompareRows(mixed, 'change').map((entry) => entry.id)).toEqual([
			'b',
			'e',
			'c',
			'd',
			'a'
		]);
	});
});

describe('picking and stepping', () => {
	const times = [10, 20, 30, 40];
	it('steps among the selectable buckets, clamped to the ends', () => {
		expect(stepCompareTime(times, 20, 1)).toBe(30);
		expect(stepCompareTime(times, 20, -10)).toBe(10);
		expect(stepCompareTime(times, 40, 10)).toBe(40);
		expect(stepCompareTime([], 20, 1)).toBeNull();
	});
	it('steps from where an unlisted time would sit, or from the end it heads for', () => {
		expect(stepCompareTime(times, 25, 1)).toBe(30);
		expect(stepCompareTime(times, 25, -1)).toBe(20);
		expect(stepCompareTime(times, 99, -1)).toBe(40);
		expect(stepCompareTime(times, null, 1)).toBe(10);
		expect(stepCompareTime(times, null, -1)).toBe(40);
	});
	it('finds the nearest bucket and opens on the first and last', () => {
		expect(nearestCompareTime(times, 26)).toBe(30);
		expect(nearestCompareTime(times, 25)).toBe(20);
		expect(nearestCompareTime([], 25)).toBeNull();
		expect(defaultComparePair(times)).toEqual({ a: 10, b: 40 });
		expect(defaultComparePair([])).toEqual({ a: null, b: null });
	});
	it('sets the armed slot and arms the other', () => {
		expect(pickCompareTime({ a: 10, b: 40 }, 'a', 20)).toEqual({
			pair: { a: 20, b: 40 },
			armed: 'b'
		});
		expect(pickCompareTime({ a: 20, b: 40 }, 'b', 30).armed).toBe('a');
	});
});

describe('comparison state', () => {
	const cards = /** @type {const} */ (['generation', 'market', 'emissions']);
	it('keeps known cards in card order and validates both times', () => {
		expect(
			normaliseCardComparison({ cards: ['emissions', 'bad', 'generation'], a, b: 'x' }, cards)
		).toEqual({ cards: ['generation', 'emissions'], a, b: null });
		for (const bad of ['', 'bad', true, -1, 1.5, Infinity, '1e12', 8.64e15 + 1])
			expect(normaliseCardComparison({ cards: ['market'], a: bad, b }, cards)?.a).toBeNull();
	});
	it('is closed without an open card', () => {
		expect(normaliseCardComparison({ cards: [], a, b }, cards)).toBeNull();
		expect(normaliseCardComparison(null, cards)).toBeNull();
	});
	it('shares A and B as cards open, and closes with the last card', () => {
		const first = toggleCompareCard(null, 'market', true, { a, b });
		expect(first).toEqual({ cards: ['market'], a, b });
		/** @type {{cards: Array<'generation' | 'market'>, a: number | null, b: number | null}} */
		const moved = { cards: ['market'], a: b, b };
		const both = toggleCompareCard(moved, 'generation', true, { a: 1, b: 2 });
		expect(both).toEqual({ cards: ['market', 'generation'], a: b, b });
		expect(toggleCompareCard(both, 'market', false, { a, b })?.cards).toEqual(['generation']);
		expect(toggleCompareCard({ cards: ['market'], a, b }, 'market', false, { a, b })).toBeNull();
	});
});

describe('compareDataset', () => {
	it('exports raw signed values, blanks and reproducible context through the shared serialiser', () => {
		const dataset = compareDataset(compareRows(source(), { a, b }), {
			key: 'generation-comparison',
			title: 'Generation comparison',
			rowHeader: 'Technology',
			unit: 'MWh',
			mode: 'relative',
			a: '1 Aug 2026',
			b: '2 Aug 2026',
			context: [
				{ key: 'region', header: 'Region', value: 'wem' },
				{ key: 'timeZone', header: 'Network time', value: 'AWST (UTC+08:00)' },
				{ key: 'interval', header: 'Interval', value: '1d' }
			]
		});
		const csv = datasetToCsv(dataset, '+08:00');
		expect(csv).toContain('Load (as consumption)');
		expect(csv).toContain('Change B − A (MWh)');
		expect(csv).toContain('Change / |A| (%)');
		// Loads as the panel shows them, consumption positive, and flagged.
		expect(csv).toContain(
			'wem,AWST (UTC+08:00),1d,Charging,true,1 Aug 2026,2 Aug 2026,40,20,-20,-50'
		);
		expect(csv).toContain(
			'wem,AWST (UTC+08:00),1d,Coal,false,1 Aug 2026,2 Aug 2026,100,0,-100,-100'
		);
		expect(csv).toContain('wem,AWST (UTC+08:00),1d,Wind,false,1 Aug 2026,2 Aug 2026,,30,,');
	});
	it('names points and rank changes in their own terms, without a percentage column', () => {
		const rows = compareRows(source({ kind: 'lines', deltaMode: 'points' }), { a, b });
		const points = compareDataset(rows, {
			key: 'k',
			title: 't',
			rowHeader: 'Region',
			unit: '% demand',
			mode: 'points',
			a: 'A',
			b: 'B'
		});
		expect(points.columns.map((column) => column.header)).toEqual([
			'Region',
			'A',
			'B',
			'A (% demand)',
			'B (% demand)',
			'Change B − A (pp)'
		]);
		const ranks = compareDataset(rows, {
			key: 'k',
			title: 't',
			rowHeader: 'Region',
			unit: '%',
			mode: 'rank',
			a: 'A',
			b: 'B'
		});
		expect(ranks.columns.map((column) => column.header).slice(3)).toEqual([
			'A (rank)',
			'B (rank)',
			'Places moved (A → B)'
		]);
	});
});

describe('change formatting', () => {
	it('signs rises, keeps falls and blanks missing values', () => {
		expect(formatSignedChange(12, String)).toBe('+12');
		expect(formatSignedChange(-3, String)).toBe('-3');
		expect(formatSignedChange(0, String)).toBe('0');
		const oneDecimal = (/** @type {number} */ value) => value.toFixed(1);
		expect(formatSignedChange(-0.01, oneDecimal)).toBe('0.0');
		expect(formatSignedChange(null, String)).toBe('—');
		expect(formatComparePercent(12.34)).toBe('+12.3%');
		expect(formatComparePercent(null)).toBe('—');
		expect(formatRankChange(2)).toBe('▲2');
		expect(formatRankChange(-1.5)).toBe('▼1.5');
		expect(formatRankChange(0)).toBe('0');
	});
});
