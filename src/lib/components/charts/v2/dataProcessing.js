/**
 * Data Processing Utilities for Chart v2
 *
 * Provides flexible data transformation from raw statistics
 * to chart-ready time series data.
 */

import StatisticV2 from '$lib/utils/Statistic/v2.js';
import TimeSeriesV2 from '$lib/utils/TimeSeries/v2.js';
import { bucketStartMs } from './bucket-boundaries.js';
import { localYearMonth } from './date-labels.js';
import { offsetHoursFromIana } from './network-time.js';
import { perfSpan } from './perf.js';

/**
 * @typedef {Object} ProcessingOptions
 * @property {Object.<string, string[]>} [groupMap] - Map group names to source IDs
 * @property {string[]} [groupOrder] - Order for the groups in output
 * @property {string[]} [loadsToInvert] - IDs to invert (make negative)
 * @property {string} [targetInterval] - Target aggregation interval
 * @property {boolean} [aggregateToInterval] - Whether to aggregate
 * @property {(acc: Object, item: any) => Object} [labelReducer] - Custom label reducer
 * @property {(acc: Object, item: any) => Object} [colourReducer] - Custom colour reducer
 * @property {string} [statsType] - Stats type ('history' | 'forecast')
 */

/**
 * @typedef {Object} ProcessedResult
 * @property {StatisticV2} stats - The processed statistics
 * @property {TimeSeriesV2} timeseries - The time series data
 */

/**
 * Process raw statistics data into chart-ready time series
 *
 * @param {any[]} data - Raw statistics data
 * @param {string} unit - Unit of measurement
 * @param {ProcessingOptions} [options]
 * @returns {ProcessedResult}
 *
 * @example
 * const result = processData(rawData, 'MW', {
 *   groupMap: { solar: ['solar_utility', 'solar_rooftop'] },
 *   groupOrder: ['solar', 'wind', 'coal'],
 *   loadsToInvert: ['battery_charging'],
 *   colourReducer: myColourReducer
 * });
 */
export function processData(data, unit, options = {}) {
	const {
		groupMap,
		groupOrder,
		loadsToInvert,
		targetInterval,
		aggregateToInterval = false,
		labelReducer,
		colourReducer,
		statsType = 'history'
	} = options;

	// Step 1: Create Statistic instance
	const stats = new StatisticV2(data, { statsType, unit });

	// Step 2: Invert values if specified
	if (loadsToInvert?.length) {
		stats.invertValues(loadsToInvert);
	}

	// Step 3: Group data if groupMap provided
	if (groupMap) {
		stats.group(groupMap);
	}

	// Step 4: Reorder if order specified
	if (groupOrder) {
		stats.reorder(groupOrder);
	}

	// Step 5: Create TimeSeries
	const timeseries = new TimeSeriesV2(stats.getData(), {
		statsType,
		labelReducer,
		colourReducer
	});

	// Step 6: Transform to time series format
	timeseries.transform();

	// Step 7: Aggregate if requested
	if (aggregateToInterval && targetInterval) {
		timeseries.aggregate(targetInterval);
	}

	// Step 8: Calculate min/max
	timeseries.updateMinMax();

	return { stats, timeseries };
}

/**
 * Convenience function that returns chart-ready format directly
 *
 * @param {any[]} data - Raw statistics data
 * @param {string} unit - Unit of measurement
 * @param {ProcessingOptions} [options]
 */
export function processForChart(data, unit, options = {}) {
	const { stats, timeseries } = processData(data, unit, options);
	return {
		...timeseries.toChartFormat(),
		stats
	};
}

/**
 * Filter time series data by date range
 *
 * @param {any[]} data - Array of data points with date/time
 * @param {Date} startDate - Start of range (inclusive)
 * @param {Date} endDate - End of range (inclusive)
 * @returns {any[]}
 */
export function filterByDateRange(data, startDate, endDate) {
	const startTime = startDate.getTime();
	const endTime = endDate.getTime();

	return data.filter((d) => {
		const time = d.time ?? d.date?.getTime?.();
		return time >= startTime && time <= endTime;
	});
}

/**
 * Create a reusable processor with preset options
 *
 * @param {ProcessingOptions} presetOptions - Default options
 * @returns {(data: any[], unit: string, overrides?: ProcessingOptions) => ProcessedResult}
 *
 * @example
 * const processAuGrid = createProcessor({
 *   groupMap: auGridGroupMap,
 *   groupOrder: auGridOrder,
 *   loadsToInvert: loadFuelTechs
 * });
 *
 * const result = processAuGrid(data, 'MW');
 */
export function createProcessor(presetOptions) {
	return (data, unit, overrides = {}) => {
		return processData(data, unit, { ...presetOptions, ...overrides });
	};
}

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
 * Aggregate time series data to a larger interval
 *
 * @param {any[]} data - Time series data
 * @param {string} targetInterval - Target interval (e.g., '30m', '1h')
 * @param {string[]} seriesNames - Names of series to aggregate
 * @param {'sum' | 'mean'} [method='mean'] - Aggregation method
 * @param {{ trimPartialEdges?: boolean }} [options] - `trimPartialEdges` drops
 *   incomplete first/last buckets (a display policy — see below); off by default
 *   so plain aggregation never silently discards data.
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
	const buckets = new Map();

	for (const point of data) {
		const bucketTime = Math.floor(point.time / intervalMs) * intervalMs;

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

	/** @type {any[]} */
	const result = [];
	for (const bucket of buckets.values()) {
		/** @type {any} */
		const point = {
			date: bucket.date,
			time: bucket.time
		};
		finaliseBucket(bucket, point, seriesNames, method);
		result.push(point);
	}

	result.sort((a, b) => a.time - b.time);

	// Drop incomplete edge buckets when the caller opts in. The first and last
	// visible buckets usually straddle the viewport bounds (the range slice is
	// exact) or "now", so they hold only part of their source samples and a plain
	// sum understates them — a false dip at the start/end of the period (e.g.
	// facility emissions / market-value volume at 30m). Callers request this for
	// summed (volume) display series; averaged (rate) series don't have the
	// problem. "Full" is the richest bucket's sample count, so genuinely complete
	// edge buckets, or data with no real aggregation (one sample per bucket), are
	// left untouched; we never empty the result.
	if (trimPartialEdges && result.length > 1) {
		let fullCount = 0;
		for (const bucket of buckets.values()) {
			if (bucket._count > fullCount) fullCount = bucket._count;
		}
		if (fullCount > 1) {
			const isPartial = (/** @type {any} */ row) =>
				(buckets.get(row.time)?._count ?? 0) < fullCount;
			// The enclosing guard already ensures length > 1 here; re-check only after
			// a pop, so a two-bucket, both-partial view keeps its (leading) bucket.
			if (isPartial(result[result.length - 1])) result.pop();
			if (result.length > 1 && isPartial(result[0])) result.shift();
		}
	}

	return result;
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
	const buckets = new Map();

	// Derive UTC offset from the IANA zone name (DST-free zones only)
	const offsetHours = offsetHoursFromIana(ianaTimeZone);

	for (const point of data) {
		const { year, month0 } = localYearMonth(new Date(point.time), ianaTimeZone);
		const key = year * 12 + month0;

		let bucket = buckets.get(key);
		if (!bucket) {
			// Start of month in local tz, expressed as UTC ms
			const monthStart = new Date(Date.UTC(year, month0, 1, -offsetHours));
			const { sums, counts } = newBucketSums(seriesNames);
			bucket = {
				time: monthStart.getTime(),
				date: monthStart,
				_sums: sums,
				_counts: counts,
				_count: 0
			};
			buckets.set(key, bucket);
		}

		bucket._count++;
		accumulateIntoBucket(bucket, point, seriesNames);
	}

	/** @type {any[]} */
	const result = [];
	for (const bucket of buckets.values()) {
		/** @type {any} */
		const point = { date: bucket.date, time: bucket.time };
		finaliseBucket(bucket, point, seriesNames, method);
		result.push(point);
	}

	return result.sort((a, b) => a.time - b.time);
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
	const offsetHours = offsetHoursFromIana(ianaTimeZone);
	/** @type {Map<number, any>} */
	const buckets = new Map();

	for (const point of data) {
		const start = bucketStartMs(kind, point.time, offsetHours);
		let bucket = buckets.get(start);
		if (!bucket) {
			const { sums, counts } = newBucketSums(seriesNames);
			bucket = { time: start, date: new Date(start), _sums: sums, _counts: counts };
			buckets.set(start, bucket);
		}
		accumulateIntoBucket(bucket, point, seriesNames);
	}

	/** @type {any[]} */
	const result = [];
	for (const bucket of buckets.values()) {
		/** @type {any} */
		const out = { date: bucket.date, time: bucket.time };
		finaliseBucket(bucket, out, seriesNames, method);
		result.push(out);
	}

	return result.sort((a, b) => a.time - b.time);
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

// Re-export the v2 classes for direct use
export { StatisticV2, TimeSeriesV2 };
