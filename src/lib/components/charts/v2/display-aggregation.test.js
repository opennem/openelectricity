import { describe, it, expect } from 'vitest';
import { createVisibleAggregation } from './display-aggregation.js';
import { aggregateForDisplay } from './dataProcessing.js';
import { bisectTime, bisectTimeRight } from './binary-search.js';

const MIN_5 = 5 * 60 * 1000;
const TZ = 'Australia/Brisbane';

/**
 * Build a 5m-grain cache of `n` rows for one series starting at `startMs`.
 * @param {number} n
 * @param {number} [startMs]
 */
function makeCache(n, startMs = Date.UTC(2026, 0, 20, 14, 0)) {
	const data = [];
	for (let i = 0; i < n; i++) {
		const time = startMs + i * MIN_5;
		data.push({ date: new Date(time), time, a: i });
	}
	return { data, seriesNames: ['a'] };
}

const opts = (/** @type {Partial<any>} */ overrides = {}) => ({
	viewStart: Date.UTC(2026, 0, 20, 14, 0),
	viewEnd: Date.UTC(2026, 0, 20, 20, 0),
	apiInterval: '5m',
	displayInterval: '30m',
	ianaTimeZone: TZ,
	method: /** @type {'sum' | 'mean'} */ ('mean'),
	...overrides
});

describe('createVisibleAggregation', () => {
	it('matches a direct getDataForRange-equivalent slice + aggregateForDisplay', () => {
		const cache = makeCache(200);
		const o = opts();
		const memo = createVisibleAggregation();

		const direct = aggregateForDisplay(
			cache.data.slice(bisectTime(cache.data, o.viewStart), bisectTimeRight(cache.data, o.viewEnd)),
			cache.seriesNames,
			o
		);

		expect(memo(cache, o)).toEqual(direct);
	});

	it('returns the identical array reference while the slice and options are unchanged', () => {
		const cache = makeCache(200);
		const memo = createVisibleAggregation();

		// Start off a sample boundary so sub-sample shifts keep the same slice.
		const base = opts({ viewStart: opts().viewStart + 1, viewEnd: opts().viewEnd + 1 });
		const first = memo(cache, base);
		expect(memo(cache, base)).toBe(first);

		// A viewport shift smaller than one native sample keeps the same slice
		// indices — still a hit.
		expect(
			memo(
				cache,
				opts({ viewStart: base.viewStart + MIN_5 - 2, viewEnd: base.viewEnd + MIN_5 - 2 })
			)
		).toBe(first);
	});

	it('recomputes when the slice indices change', () => {
		const cache = makeCache(200);
		const memo = createVisibleAggregation();
		const first = memo(cache, opts());

		const shifted = memo(cache, opts({ viewStart: opts().viewStart + MIN_5 }));
		expect(shifted).not.toBe(first);
	});

	it('recomputes when the cache identity changes (merge produces a new array)', () => {
		const memo = createVisibleAggregation();
		const first = memo(makeCache(200), opts());
		const second = memo(makeCache(200), opts());
		expect(second).not.toBe(first);
		expect(second).toEqual(first);
	});

	it('recomputes when any aggregation option changes', () => {
		const cache = makeCache(200);
		const memo = createVisibleAggregation();
		const base = memo(cache, opts());

		expect(memo(cache, opts({ method: 'sum' }))).not.toBe(base);
		expect(memo(cache, opts({ displayInterval: '5m' }))).not.toBe(base);
	});

	it('returns a stable empty array for empty or missing caches', () => {
		const memo = createVisibleAggregation();
		expect(memo(null, opts())).toEqual([]);
		expect(memo({ data: [], seriesNames: [] }, opts())).toEqual([]);
	});
});
