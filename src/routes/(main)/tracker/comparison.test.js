import { describe, expect, it } from 'vitest';
import {
	comparisonBuckets,
	comparisonValues,
	comparisonRows,
	comparisonCsv,
	normaliseComparison
} from './comparison.js';
import { applyTrackerUrl, parseTrackerUrl } from './tracker-url.js';

const a = Date.parse('2026-08-01T00:00:00Z');
const b = a + 86_400_000;
const snapshot = {
	queryKey: 'test',
	start: a,
	end: b,
	data: [
		{ time: a, coal: 100, load: -40 },
		{ time: b, coal: 0, load: -20 },
		{ time: b + 1000, coal: 0, _bandClose: true }
	],
	nativeData: [],
	seriesNames: ['load', 'coal'],
	seriesLabels: { coal: 'Coal', load: 'Charging' },
	seriesColours: {}
};

describe('two-date comparison', () => {
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
		expect(comparisonValues(first, second)).toMatchObject({ delta, percent });
	});
	it('uses displayed buckets, excludes synthetic closes and preserves top-down group order', () => {
		expect(comparisonBuckets(snapshot).map((row) => row.time)).toEqual([a, b]);
		expect(comparisonRows(snapshot, { a, b })).toMatchObject([
			{ id: 'coal', a: 100, b: 0, delta: -100, percent: -100 },
			{ id: 'load', a: -40, b: -20, delta: 20, percent: 50 }
		]);
		expect(comparisonRows(snapshot, { a, b }, ['coal']).map((row) => row.id)).toEqual(['load']);
	});
	it('does not snap missing dates to a neighbour or silently reselect after range changes', () => {
		expect(comparisonRows(snapshot, { a: a + 1000, b })[0]).toMatchObject({
			a: null,
			b: 0,
			delta: null
		});
		expect(comparisonRows(null, { a, b })).toEqual([]);
		expect(comparisonRows(snapshot, { a, b: a })[0].delta).toBe(0);
	});
	it('validates dates without accepting blank, non-finite, fractional or out-of-range values', () => {
		for (const bad of ['', 'bad', true, -1, 1.5, Infinity, '1e12', 8.64e15 + 1])
			expect(normaliseComparison({ a: bad, b })).toEqual({ a: null, b });
		expect(normaliseComparison(null)).toBeNull();
	});
	it('round trips comparison visibility and both exact dates, clearing obsolete parameters', () => {
		const context = { nowMs: b };
		const state = parseTrackerUrl(new URLSearchParams(), context);
		const url = applyTrackerUrl(new URL('https://example.test/tracker'), {
			...state,
			comparison: { a, b }
		});
		expect(parseTrackerUrl(url.searchParams, context).comparison).toEqual({ a, b });
		applyTrackerUrl(url, state);
		expect(url.searchParams.has('compare')).toBe(false);
		expect(url.searchParams.has('compare-a')).toBe(false);
		expect(url.searchParams.has('compare-b')).toBe(false);
		expect(
			parseTrackerUrl(new URLSearchParams('compare=1&compare-a=bad'), context).comparison
		).toEqual({ a: null, b: null });
	});
	it('exports raw signed values, blanks and reproducible context', () => {
		const csv = comparisonCsv(comparisonRows(snapshot, { a, b }), {
			region: 'wem',
			zone: '+08:00',
			interval: '1d',
			a: '1 Aug 2026',
			b: '2 Aug 2026',
			unit: 'MWh'
		});
		expect(csv).toContain('Change B − A (MWh)');
		expect(csv).toContain('wem,UTC+08:00,1d,Charging,1 Aug 2026,2 Aug 2026,-40,-20,20,50');
	});
});
