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

describe('sliced memo parity with slice-then-aggregate', () => {
	const DAY = 24 * 60 * 60 * 1000;

	/** Deterministic PRNG. @param {number} seed */
	function mulberry32(seed) {
		return () => {
			seed |= 0;
			seed = (seed + 0x6d2b79f5) | 0;
			let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/**
	 * Two-series cache with nulls and missing rows, starting at Brisbane midnight.
	 * @param {number} n
	 * @param {number} intervalMs
	 */
	function makeMessyCache(n, intervalMs) {
		const startMs = Date.UTC(2026, 0, 1, -10);
		const data = [];
		for (let i = 0; i < n; i++) {
			if (i % 23 === 11) continue;
			const time = startMs + i * intervalMs;
			data.push({
				date: new Date(time),
				time,
				a: Math.sin(i / 5) * 100 + i,
				b: i % 7 === 3 ? null : Math.cos(i / 9) * 50
			});
		}
		return { data, seriesNames: ['a', 'b'] };
	}

	/** Monthly rows (real calendar months, Brisbane-local starts). @param {number} n */
	function makeMonthlyCache(n) {
		const data = [];
		for (let i = 0; i < n; i++) {
			const time = Date.UTC(2024, i, 1, -10);
			data.push({ date: new Date(time), time, a: 10 + i, b: i % 5 === 2 ? null : 3 * i });
		}
		return { data, seriesNames: ['a', 'b'] };
	}

	/**
	 * @param {{ data: any[], seriesNames: string[] }} cache
	 * @param {any} o
	 */
	function reference(cache, o) {
		return aggregateForDisplay(
			cache.data.slice(bisectTime(cache.data, o.viewStart), bisectTimeRight(cache.data, o.viewEnd)),
			cache.seriesNames,
			o
		);
	}

	const cases = [
		{
			name: '30m sum from 5m (partial-edge trim)',
			cache: () => makeMessyCache(600, MIN_5),
			displayInterval: '30m',
			apiInterval: '5m',
			method: /** @type {const} */ ('sum')
		},
		{
			name: '30m mean from 5m (partial edges kept)',
			cache: () => makeMessyCache(600, MIN_5),
			displayInterval: '30m',
			apiInterval: '5m',
			method: /** @type {const} */ ('mean')
		},
		{
			name: '1M sum from 1d',
			cache: () => makeMessyCache(240, DAY),
			displayInterval: '1M',
			apiInterval: '1d',
			method: /** @type {const} */ ('sum')
		},
		{
			name: 'quarter mean from 1M',
			cache: () => makeMonthlyCache(30),
			displayInterval: 'quarter',
			apiInterval: '1M',
			method: /** @type {const} */ ('mean')
		},
		{
			name: 'native passthrough (5m display over 5m fetch)',
			cache: () => makeMessyCache(300, MIN_5),
			displayInterval: '5m',
			apiInterval: '5m',
			method: /** @type {const} */ ('sum')
		}
	];

	for (const c of cases) {
		it(`matches the reference for random viewports — ${c.name}`, () => {
			const cache = c.cache();
			const memo = createVisibleAggregation();
			const rand = mulberry32(42);
			const first = cache.data[0].time;
			const last = cache.data[cache.data.length - 1].time;
			const span = last - first;

			for (let i = 0; i < 40; i++) {
				// Include out-of-range edges and tiny or empty spans.
				const a = first + (rand() - 0.2) * span;
				const b = a + rand() * rand() * span;
				const o = {
					viewStart: Math.round(a),
					viewEnd: Math.round(b),
					apiInterval: c.apiInterval,
					displayInterval: c.displayInterval,
					ianaTimeZone: TZ,
					method: c.method
				};
				expect(memo(cache, o), `viewport #${i}: ${o.viewStart}→${o.viewEnd}`).toEqual(
					reference(cache, o)
				);
			}
		});
	}

	it('padded mode keeps the array identity until the pan travels a full pad', () => {
		const cache = makeMessyCache(600, MIN_5);
		const memo = createVisibleAggregation();
		const base = {
			viewStart: cache.data[100].time,
			viewEnd: cache.data[300].time,
			apiInterval: '5m',
			displayInterval: '30m',
			ianaTimeZone: TZ,
			method: /** @type {const} */ ('mean')
		};

		const pad = 24;
		const v1 = memo(cache, base, { pad });
		// A short pan remains within the same quantised slice.
		const v2 = memo(
			cache,
			{ ...base, viewStart: base.viewStart + 3 * MIN_5, viewEnd: base.viewEnd + 3 * MIN_5 },
			{ pad }
		);
		expect(v2).toBe(v1);
		// Crossing the pad recomputes the slice.
		const v3 = memo(
			cache,
			{ ...base, viewStart: base.viewStart + 30 * MIN_5, viewEnd: base.viewEnd + 30 * MIN_5 },
			{ pad }
		);
		expect(v3).not.toBe(v1);
	});

	it('padded rows are whole display buckets covering the viewport', () => {
		const cache = makeMessyCache(600, MIN_5);
		const memo = createVisibleAggregation();
		const o = {
			viewStart: cache.data[97].time,
			viewEnd: cache.data[301].time,
			apiInterval: '5m',
			displayInterval: '30m',
			ianaTimeZone: TZ,
			method: /** @type {const} */ ('mean')
		};

		const padded = memo(cache, o, { pad: 24 });
		// Padded rows reuse whole buckets from the full aggregation.
		const full = aggregateForDisplay(cache.data, cache.seriesNames, o);
		const byTime = new Map(full.map((row) => [row.time, row]));
		for (const row of padded) {
			expect(row).toEqual(byTime.get(row.time));
		}
		// The padded span must cover the viewport.
		expect(padded[0].time).toBeLessThanOrEqual(o.viewStart);
		expect(padded[padded.length - 1].time + 30 * 60 * 1000).toBeGreaterThanOrEqual(o.viewEnd);
	});

	it('returns to exact parity after a padded gesture (settle path)', () => {
		const cache = makeMessyCache(600, MIN_5);
		const memo = createVisibleAggregation();
		const o = {
			viewStart: cache.data[100].time + 7 * 60 * 1000,
			viewEnd: cache.data[300].time,
			apiInterval: '5m',
			displayInterval: '30m',
			ianaTimeZone: TZ,
			method: /** @type {const} */ ('sum')
		};

		expect(memo(cache, o)).toEqual(reference(cache, o));
		memo(cache, o, { pad: 24 });
		expect(memo(cache, o)).toEqual(reference(cache, o));
	});
});
