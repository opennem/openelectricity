/**
 * Display aggregation for Chart v2 — bucketing native-grain rows to the
 * user-facing display interval (30m, month, season/half/fy/quarter).
 *
 * The legacy StatisticV2 → TimeSeriesV2 pipeline lives in
 * `legacy-transform.js` and is re-exported below so existing imports keep
 * working.
 */

import { bucketStartMs } from './bucket-boundaries.js';
import { localYearMonth } from './date-labels.js';
import { offsetHoursFromIana } from './network-time.js';
import { perfSpan } from './perf.js';

/**
 * Per-series incremental sums/counts for one bucket. The buckets used to push
 * every sample into per-series arrays and reduce at the end; incremental
 * in-order addition produces bit-identical sums with no per-sample allocation.
 * @param {string[]} seriesNames
 */
function newBucketSums(seriesNames) {
	/** @type {Record<string, number>} */
	const sums = {};
	/** @type {Record<string, number>} */
	const counts = {};
	for (const name of seriesNames) {
		sums[name] = 0;
		counts[name] = 0;
	}
	return { sums, counts };
}

/**
 * Fold one row's values into a bucket's sums/counts (nulls skipped).
 * @param {{ _sums: Record<string, number>, _counts: Record<string, number> }} bucket
 * @param {any} point
 * @param {string[]} seriesNames
 */
function accumulateIntoBucket(bucket, point, seriesNames) {
	for (const name of seriesNames) {
		const value = point[name];
		if (value !== null && value !== undefined) {
			bucket._sums[name] += value;
			bucket._counts[name]++;
		}
	}
}

/**
 * Write a bucket's aggregated values onto an output row: null when no samples,
 * else the sum or the mean.
 * @param {{ _sums: Record<string, number>, _counts: Record<string, number> }} bucket
 * @param {any} out
 * @param {string[]} seriesNames
 * @param {'sum' | 'mean'} method
 */
function finaliseBucket(bucket, out, seriesNames, method) {
	for (const name of seriesNames) {
		const count = bucket._counts[name];
		if (count === 0) {
			out[name] = null;
		} else {
			out[name] = method === 'sum' ? bucket._sums[name] : bucket._sums[name] / count;
		}
	}
}

/**
 * Group sorted rows into display buckets and return each bucket's source count.
 * All aggregators use this path to calculate values and handle nulls consistently.
 *
 * @param {any[]} data - Time-sorted rows
 * @param {string[]} seriesNames
 * @param {'sum' | 'mean'} method
 * @param {(timeMs: number) => number} bucketTimeOf - Bucket start for a sample
 * @returns {{ rows: any[], counts: number[] }}
 */
export function bucketAggregate(data, seriesNames, method, bucketTimeOf) {
	const buckets = new Map();

	for (const point of data) {
		const bucketTime = bucketTimeOf(point.time);

		let bucket = buckets.get(bucketTime);
		if (!bucket) {
			const { sums, counts } = newBucketSums(seriesNames);
			bucket = {
				time: bucketTime,
				date: new Date(bucketTime),
				_sums: sums,
				_counts: counts,
				_count: 0
			};
			buckets.set(bucketTime, bucket);
		}

		bucket._count++;
		accumulateIntoBucket(bucket, point, seriesNames);
	}

	const sorted = [...buckets.values()].sort((a, b) => a.time - b.time);
	/** @type {any[]} */
	const rows = [];
	/** @type {number[]} */
	const counts = [];
	for (const bucket of sorted) {
		/** @type {any} */
		const point = { date: bucket.date, time: bucket.time };
		finaliseBucket(bucket, point, seriesNames, method);
		rows.push(point);
		counts.push(bucket._count);
	}
	return { rows, counts };
}

/**
 * Fold native rows `[lo, hi)` into one display bucket.
 *
 * @param {any[]} data - Time-sorted rows
 * @param {number} lo - Inclusive start index
 * @param {number} hi - Exclusive end index
 * @param {string[]} seriesNames
 * @param {'sum' | 'mean'} method
 * @param {number} bucketTime - Bucket start (ms)
 * @returns {{ row: any, count: number }}
 */
export function foldBucketRange(data, lo, hi, seriesNames, method, bucketTime) {
	const { sums, counts } = newBucketSums(seriesNames);
	const bucket = { _sums: sums, _counts: counts };
	for (let i = lo; i < hi; i++) {
		accumulateIntoBucket(bucket, data[i], seriesNames);
	}
	/** @type {any} */
	const row = { date: new Date(bucketTime), time: bucketTime };
	finaliseBucket(bucket, row, seriesNames, method);
	return { row, count: hi - lo };
}

/**
 * Aggregate time series data to a larger interval
 *
 * @param {any[]} data - Time series data
 * @param {string} targetInterval - Target interval (e.g., '30m', '1h')
 * @param {string[]} seriesNames - Names of series to aggregate
 * @param {'sum' | 'mean'} [method='mean'] - Aggregation method
 * @param {{ trimPartialEdges?: boolean }} [options] - Drop incomplete edge buckets
 * @returns {any[]}
 */
export function aggregateToInterval(
	data,
	targetInterval,
	seriesNames,
	method = 'mean',
	{ trimPartialEdges = false } = {}
) {
	const intervalMs = parseIntervalMs(targetInterval);
	const { rows: result, counts } = bucketAggregate(
		data,
		seriesNames,
		method,
		(t) => Math.floor(t / intervalMs) * intervalMs
	);

	// Drop incomplete edge buckets when the caller opts in. The first and last
	// visible buckets usually straddle the viewport bounds (the range slice is
	// exact) or "now", so they hold only part of their source samples and a plain
	// sum understates them — a false dip at the start/end of the period (e.g.
	// facility emissions / market-value volume at 30m). Callers request this for
	// summed (volume) display series; averaged (rate) series don't have the
	// problem. "Full" is the richest bucket's sample count, so genuinely complete
	// edge buckets, or data with no real aggregation (one sample per bucket), are
	// left untouched; we never empty the result.
	if (trimPartialEdges) {
		trimPartialEdgeRows(result, counts);
	}

	return result;
}

/**
 * Remove incomplete edge buckets without emptying the result.
 *
 * @param {any[]} rows - Sorted display rows (mutated)
 * @param {number[]} counts - Source-row count per row, aligned with `rows`
 */
export function trimPartialEdgeRows(rows, counts) {
	if (rows.length <= 1) return;
	let fullCount = 0;
	for (const count of counts) {
		if (count > fullCount) fullCount = count;
	}
	if (fullCount <= 1) return;
	if (counts[counts.length - 1] < fullCount) rows.pop();
	if (rows.length > 1 && counts[0] < fullCount) rows.shift();
}

/**
 * Parse interval string to milliseconds
 * @param {string} interval
 * @returns {number}
 */
function parseIntervalMs(interval) {
	const match = interval.match(/^(\d+)([mhd])$/);
	if (!match) return 5 * 60 * 1000;

	const value = parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case 'm':
			return value * 60 * 1000;
		case 'h':
			return value * 60 * 60 * 1000;
		case 'd':
			return value * 24 * 60 * 60 * 1000;
		default:
			return 5 * 60 * 1000;
	}
}

/**
 * Aggregate time series data to calendar months (timezone-aware).
 *
 * @param {any[]} data - Time series data with `time` (UTC ms)
 * @param {string[]} seriesNames - Names of series to aggregate
 * @param {string} ianaTimeZone - IANA timezone for month bucketing (e.g. 'Australia/Brisbane')
 * @param {'sum' | 'mean'} [method='sum'] - Aggregation method
 * @returns {any[]}
 */
export function aggregateToMonth(data, seriesNames, ianaTimeZone, method = 'sum') {
	return bucketAggregate(data, seriesNames, method, monthBucketTimeOf(ianaTimeZone)).rows;
}

/**
 * Resolve the local month's start as UTC milliseconds (DST-free zones only).
 * @param {string} ianaTimeZone
 * @returns {(timeMs: number) => number}
 */
function monthBucketTimeOf(ianaTimeZone) {
	// Derive UTC offset from the IANA zone name (DST-free zones only)
	const offsetHours = offsetHoursFromIana(ianaTimeZone);
	return (timeMs) => {
		const { year, month0 } = localYearMonth(new Date(timeMs), ianaTimeZone);
		return Date.UTC(year, month0, 1, -offsetHours);
	};
}

/**
 * Aggregate time series data into calendar buckets (quarter, season, half-year,
 * financial-year) in network-local time. Generalises `aggregateToMonth` to any
 * boundary `kind` understood by `bucketStartMs`.
 *
 * @param {any[]} data - Rows with `time` (UTC ms)
 * @param {string[]} seriesNames
 * @param {string} kind - 'quarter' | 'season' | 'half' | 'fy' | 'month' | '1y'
 * @param {string} ianaTimeZone - 'Australia/Brisbane' (NEM) or 'Australia/Perth' (WEM)
 * @param {'sum' | 'mean'} [method='sum']
 * @returns {any[]}
 */
export function aggregateByBoundary(data, seriesNames, kind, ianaTimeZone, method = 'sum') {
	return bucketAggregate(data, seriesNames, method, boundaryBucketTimeOf(kind, ianaTimeZone)).rows;
}

/**
 * Resolve calendar bucket starts for quarter, season, half-year and financial year.
 * @param {string} kind
 * @param {string} ianaTimeZone
 * @returns {(timeMs: number) => number}
 */
function boundaryBucketTimeOf(kind, ianaTimeZone) {
	const offsetHours = offsetHoursFromIana(ianaTimeZone);
	return (timeMs) => bucketStartMs(kind, timeMs, offsetHours);
}

/**
 * Single dispatch for render-layer aggregation: maps a `displayInterval` (and
 * the native `apiInterval` it was fetched at) to the right aggregation, or
 * returns the data unchanged when the fetched grain already matches. Used by
 * FacilityChart and the financial/emissions providers so they don't diverge.
 *
 * @param {any[]} data
 * @param {string[]} seriesNames
 * @param {Object} opts
 * @param {string} opts.apiInterval - native interval the data was fetched at
 * @param {string} opts.displayInterval - user-facing interval to render
 * @param {string} opts.ianaTimeZone
 * @param {'sum' | 'mean'} [opts.method='sum']
 * @returns {any[]}
 */
export function aggregateForDisplay(
	data,
	seriesNames,
	{ apiInterval, displayInterval, ianaTimeZone, method = 'sum' }
) {
	if (!data || data.length === 0) return data;

	return perfSpan('chart:aggregate', () => {
		switch (displayInterval) {
			case '30m':
				// Aggregate raw 5m samples. Summed (volume) series trim partial edge
				// buckets so a half-filled first/last period doesn't render as a false
				// dip; averaged (rate) series keep them — a partial bucket still
				// averages to the right level.
				return aggregateToInterval(data, '30m', seriesNames, method, {
					trimPartialEdges: method === 'sum'
				});
			case '1M':
				// Monthly display from daily energy; native 1M needs no aggregation.
				return apiInterval === '1d'
					? aggregateToMonth(data, seriesNames, ianaTimeZone, method)
					: data;
			case 'season':
				return apiInterval === '1M'
					? aggregateByBoundary(data, seriesNames, 'season', ianaTimeZone, method)
					: data;
			case 'half':
				// No native half-year — always aggregate from monthly.
				return aggregateByBoundary(data, seriesNames, 'half', ianaTimeZone, method);
			case 'fy':
				return apiInterval === '1M'
					? aggregateByBoundary(data, seriesNames, 'fy', ianaTimeZone, method)
					: data;
			case 'quarter':
				// Native 3M needs no aggregation; otherwise bucket from monthly.
				return apiInterval === '3M'
					? data
					: aggregateByBoundary(data, seriesNames, 'quarter', ianaTimeZone, method);
			default:
				// Native grains: 5m, 1d, 7d, 1M(native), 3M, 1y.
				return data;
		}
	});
}

/**
 * Resolve display bucket starts, or return null when aggregation is unnecessary.
 *
 * @param {{ apiInterval: string, displayInterval: string, ianaTimeZone: string }} opts
 * @returns {((timeMs: number) => number) | null}
 */
export function displayBucketTimeOf({ apiInterval, displayInterval, ianaTimeZone }) {
	switch (displayInterval) {
		case '30m': {
			const intervalMs = parseIntervalMs('30m');
			return (t) => Math.floor(t / intervalMs) * intervalMs;
		}
		case '1M':
			return apiInterval === '1d' ? monthBucketTimeOf(ianaTimeZone) : null;
		case 'season':
			return apiInterval === '1M' ? boundaryBucketTimeOf('season', ianaTimeZone) : null;
		case 'half':
			return boundaryBucketTimeOf('half', ianaTimeZone);
		case 'fy':
			return apiInterval === '1M' ? boundaryBucketTimeOf('fy', ianaTimeZone) : null;
		case 'quarter':
			return apiInterval === '3M' ? null : boundaryBucketTimeOf('quarter', ianaTimeZone);
		default:
			return null;
	}
}

/**
 * Whether display aggregation removes incomplete edge buckets.
 *
 * @param {string} displayInterval
 * @param {'sum' | 'mean'} method
 * @returns {boolean}
 */
export function displayTrimsPartialEdges(displayInterval, method) {
	return displayInterval === '30m' && method === 'sum';
}

// Legacy pipeline — moved to legacy-transform.js; re-exported so `v2/index.js`
// and the remaining route imports keep working unchanged.
export {
	processData,
	processForChart,
	filterByDateRange,
	createProcessor,
	StatisticV2,
	TimeSeriesV2
} from './legacy-transform.js';
