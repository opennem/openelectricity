/**
 * Data Processing Utilities for Chart v2
 *
 * Provides flexible data transformation from raw statistics
 * to chart-ready time series data.
 */

import StatisticV2 from '$lib/utils/Statistic/v2.js';
import TimeSeriesV2 from '$lib/utils/TimeSeries/v2.js';

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
 * Aggregate time series data to a larger interval
 *
 * @param {any[]} data - Time series data
 * @param {string} targetInterval - Target interval (e.g., '30m', '1h')
 * @param {string[]} seriesNames - Names of series to aggregate
 * @param {'sum' | 'mean'} [method='mean'] - Aggregation method
 * @returns {any[]}
 */
export function aggregateToInterval(data, targetInterval, seriesNames, method = 'mean') {
	const intervalMs = parseIntervalMs(targetInterval);
	const buckets = new Map();

	for (const point of data) {
		const bucketTime = Math.floor(point.time / intervalMs) * intervalMs;

		if (!buckets.has(bucketTime)) {
			buckets.set(bucketTime, {
				time: bucketTime,
				date: new Date(bucketTime),
				_values: {},
				_count: 0
			});

			seriesNames.forEach((name) => {
				buckets.get(bucketTime)._values[name] = [];
			});
		}

		const bucket = buckets.get(bucketTime);
		bucket._count++;

		seriesNames.forEach((name) => {
			const value = point[name];
			if (value !== null && value !== undefined) {
				bucket._values[name].push(value);
			}
		});
	}

	const result = [];
	for (const bucket of buckets.values()) {
		const point = {
			date: bucket.date,
			time: bucket.time
		};

		seriesNames.forEach((name) => {
			const values = bucket._values[name];
			if (values.length === 0) {
				point[name] = null;
			} else if (method === 'sum') {
				point[name] = values.reduce((a, b) => a + b, 0);
			} else {
				point[name] = values.reduce((a, b) => a + b, 0) / values.length;
			}
		});

		result.push(point);
	}

	return result.sort((a, b) => a.time - b.time);
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

// Re-export the v2 classes for direct use
export { StatisticV2, TimeSeriesV2 };
