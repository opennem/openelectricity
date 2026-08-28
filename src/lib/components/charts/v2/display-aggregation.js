/**
 * Viewport → display-aggregation memo.
 *
 * Cache full display aggregations by source data and options. Each viewport
 * recomputes only partial edge buckets and reuses interior rows, avoiding
 * unnecessary chart updates.
 *
 * During gestures, rounded slice bounds keep whole buckets stable until settling.
 */

import { bisectTime, bisectTimeRight } from './binary-search.js';
import {
	applyBucketFilterToDisplayRows,
	bucketFilterKindFor,
	bucketFilterPredicate
} from './bucket-filter.js';
import {
	bucketAggregate,
	displayBucketTimeOf,
	displayFullTransform,
	displayTrimsPartialEdges,
	foldBucketRange,
	trimPartialEdgeRows
} from './dataProcessing.js';
import { perfSpan } from './perf.js';

/**
 * @typedef {Object} VisibleAggregationOptions
 * @property {number} viewStart - Viewport start (ms)
 * @property {number} viewEnd - Viewport end (ms)
 * @property {string} apiInterval - Native interval the cache was fetched at
 * @property {string} displayInterval - User-facing interval to render
 * @property {string} ianaTimeZone
 * @property {'sum' | 'mean'} method
 * @property {string | null} [bucketFilter] - Recurring calendar period to display
 */

/** @type {WeakMap<object, Map<string, { rows: any[], counts: number[] }>>} */
const fullAggregations = new WeakMap();

/** @type {WeakMap<object, Map<string, any[]>>} */
const fullTransforms = new WeakMap();

/**
 * @param {{ data: any[], seriesNames: string[] }} processedCache
 * @param {string} optsKey
 * @param {(data: any[], seriesNames: string[]) => any[]} transform
 * @returns {any[]}
 */
function getFullTransformRows(processedCache, optsKey, transform) {
	let byOpts = fullTransforms.get(processedCache);
	if (!byOpts) {
		byOpts = new Map();
		fullTransforms.set(processedCache, byOpts);
	}
	let full = byOpts.get(optsKey);
	if (!full) {
		full = perfSpan('chart:transform-full', () =>
			transform(processedCache.data, processedCache.seriesNames)
		);
		byOpts.set(optsKey, full);
	}
	return full;
}

/**
 * @param {{ data: any[], seriesNames: string[] }} processedCache
 * @param {string} optsKey
 * @param {VisibleAggregationOptions} opts
 * @param {(timeMs: number) => number} bucketTimeOf
 * @returns {{ rows: any[], counts: number[] }}
 */
function getFullDisplayAggregation(processedCache, optsKey, opts, bucketTimeOf) {
	let byOpts = fullAggregations.get(processedCache);
	if (!byOpts) {
		byOpts = new Map();
		fullAggregations.set(processedCache, byOpts);
	}
	let full = byOpts.get(optsKey);
	if (!full) {
		full = perfSpan('chart:aggregate-full', () =>
			bucketAggregate(processedCache.data, processedCache.seriesNames, opts.method, bucketTimeOf)
		);
		byOpts.set(optsKey, full);
	}
	return full;
}

/**
 * Return the number of rows used to round gesture slices.
 *
 * @param {number | undefined} explicit
 * @param {number} sliceLength
 * @returns {number}
 */
function gesturePad(explicit, sliceLength) {
	if (explicit && explicit > 0) return explicit;
	return Math.max(64, 2 ** Math.ceil(Math.log2(Math.max(1, sliceLength / 8))));
}

/**
 * Create a per-chart memo for the visible-slice aggregation. A plain closure,
 * NOT a `$derived` — managers are constructed inside component effects (and
 * stashed/revived across them), so a derived would be owned by the creating
 * effect run (`derived_inert`). Reading `manager.processedCache` in the
 * calling effect still registers the reactive dependencies.
 *
 * @returns {(
 *   processedCache: { data: any[], seriesNames: string[] } | null,
 *   opts: VisibleAggregationOptions,
 *   gesture?: { pad?: number }
 * ) => any[]}
 */
export function createVisibleAggregation() {
	let key = '';
	/** @type {any[] | null} */
	let dataRef = null;
	/** @type {string[] | null} */
	let namesRef = null;
	/** @type {any[]} */
	let value = [];

	return function getVisibleAggregation(processedCache, opts, gesture) {
		if (!processedCache?.data?.length) {
			key = '';
			dataRef = null;
			namesRef = null;
			value = [];
			return value;
		}

		const rows = processedCache.data;
		const names = processedCache.seriesNames;
		// Same slice semantics as ChartDataManager.getDataForRange — inclusive
		// [viewStart, viewEnd] on the sorted, deduped cache.
		let lo = bisectTime(rows, opts.viewStart);
		let hi = bisectTimeRight(rows, opts.viewEnd);

		const pad = gesture ? gesturePad(gesture.pad, hi - lo) : 0;
		if (pad > 0) {
			lo = Math.max(0, Math.floor(lo / pad) * pad);
			hi = Math.min(rows.length, Math.ceil(hi / pad) * pad);
		}

		const mode = pad > 0 ? 'p' : 'x';
		const k = `${mode}${lo}|${hi}|${opts.apiInterval}|${opts.displayInterval}|${opts.method}|${opts.ianaTimeZone}|${opts.bucketFilter ?? ''}`;

		if (k === key && dataRef === rows && namesRef === names) return value;

		key = k;
		dataRef = rows;
		namesRef = names;
		value = computeVisibleSlice(processedCache, lo, hi, opts, pad > 0);
		return value;
	};
}

/**
 * Compute the display rows for native slice `[lo, hi)`.
 *
 * @param {{ data: any[], seriesNames: string[] }} processedCache
 * @param {number} lo
 * @param {number} hi
 * @param {VisibleAggregationOptions} opts
 * @param {boolean} padded - Gesture mode: whole buckets by reference, no trim
 * @returns {any[]}
 */
function computeVisibleSlice(processedCache, lo, hi, opts, padded) {
	return withBucketFilter(computeVisibleSliceRows(processedCache, lo, hi, opts, padded), opts);
}

/**
 * Apply the calendar filter after slicing so the full-series memo stays reusable.
 *
 * @param {any[]} rows
 * @param {VisibleAggregationOptions} opts
 * @returns {any[]}
 */
function withBucketFilter(rows, opts) {
	if (!opts.bucketFilter) return rows;
	const predicate = bucketFilterPredicate(
		bucketFilterKindFor(opts.displayInterval),
		opts.bucketFilter,
		opts.ianaTimeZone
	);
	return applyBucketFilterToDisplayRows(rows, predicate, opts.ianaTimeZone);
}

/**
 * @param {{ data: any[], seriesNames: string[] }} processedCache
 * @param {number} lo
 * @param {number} hi
 * @param {VisibleAggregationOptions} opts
 * @param {boolean} padded
 * @returns {any[]}
 */
function computeVisibleSliceRows(processedCache, lo, hi, opts, padded) {
	const rows = processedCache.data;
	if (hi <= lo) return [];

	const transform = displayFullTransform(opts);
	if (transform) {
		// Rolling windows need cache rows before the viewport, then a time-based
		// slice because the transform changes row indices.
		const optsKey = `${opts.apiInterval}|${opts.displayInterval}|${opts.method}|${opts.ianaTimeZone}`;
		const full = getFullTransformRows(processedCache, optsKey, transform);
		const from = bisectTime(full, rows[lo].time);
		const to = bisectTimeRight(full, rows[hi - 1].time);
		return full.slice(from, to);
	}

	const bucketTimeOf = displayBucketTimeOf(opts);
	if (!bucketTimeOf) {
		// The fetched grain already matches the display grain.
		return rows.slice(lo, hi);
	}

	const names = processedCache.seriesNames;
	const optsKey = `${opts.apiInterval}|${opts.displayInterval}|${opts.method}|${opts.ianaTimeZone}`;
	const full = getFullDisplayAggregation(processedCache, optsKey, opts, bucketTimeOf);
	const bucketStart = bucketTimeOf(rows[lo].time);
	const bucketEnd = bucketTimeOf(rows[hi - 1].time);

	if (padded) {
		// Reuse whole buckets; the chart clips their edge overhang.
		const from = bisectTime(full.rows, bucketStart);
		const to = bisectTimeRight(full.rows, bucketEnd);
		return full.rows.slice(from, to);
	}

	return perfSpan('chart:aggregate', () => {
		const trim = displayTrimsPartialEdges(opts.displayInterval, opts.method);

		if (bucketStart === bucketEnd) {
			const { row, count } = foldBucketRange(rows, lo, hi, names, opts.method, bucketStart);
			const out = [row];
			if (trim) trimPartialEdgeRows(out, [count]);
			return out;
		}

		// Find native rows in the two edge buckets.
		let leftEnd = lo;
		while (leftEnd < hi && bucketTimeOf(rows[leftEnd].time) === bucketStart) leftEnd++;
		let rightStart = hi - 1;
		while (rightStart > leftEnd && bucketTimeOf(rows[rightStart - 1].time) === bucketEnd) {
			rightStart--;
		}

		const left = foldBucketRange(rows, lo, leftEnd, names, opts.method, bucketStart);
		const right = foldBucketRange(rows, rightStart, hi, names, opts.method, bucketEnd);

		// Reuse fully covered interior buckets from the full aggregation.
		const from = bisectTimeRight(full.rows, bucketStart);
		const to = bisectTime(full.rows, bucketEnd);
		const out = [left.row, ...full.rows.slice(from, to), right.row];
		if (trim) {
			const counts = [left.count, ...full.counts.slice(from, to), right.count];
			trimPartialEdgeRows(out, counts);
		}
		return out;
	});
}
