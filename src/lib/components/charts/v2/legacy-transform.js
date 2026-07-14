/**
 * Legacy StatisticV2 → TimeSeriesV2 processing pipeline.
 *
 * Kept for the routes that still consume it (scenarios/lens/info-graphics via
 * `v2/index.js`, `studio/lens-on-au-grid`). The current chart routes
 * (facility, explorer) bypass it entirely — they process API responses through
 * the timestamp-union core in `series-rows.js`, which keys rows on real API
 * timestamps.
 *
 * WARNING: `TimeSeriesV2.transform()` is positionally indexed — it takes the
 * start time and interval from the FIRST series and reads every series' values
 * by array index, so series with different start times or lengths land on the
 * wrong timestamps. Do not use this pipeline for multi-series data whose
 * series can differ in coverage (the bug `processFacilityPower` was written to
 * avoid); prefer the series-rows core for new work.
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

// Re-export the v2 classes for direct use
export { StatisticV2, TimeSeriesV2 };
