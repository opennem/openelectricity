/**
 * Process facility price/market_value API response into chart-ready format.
 *
 * Unlike processFacilityPower, this doesn't require unit-to-fuel-tech mapping.
 * Handles single-series data (e.g. regional spot price) as well as per-unit
 * series that may not match the facility's unit map.
 *
 * Output shape matches the chart pipeline:
 *   { data: [{date, time, series1: val, ...}], seriesNames, seriesLabels, seriesColours }
 */

import { stripDateTimezone } from '$lib/utils/date-format.js';

const PRICE_COLOUR = '#e63946';

/**
 * @typedef {Object} ProcessPriceDataConfig
 * @property {string} [metricFilter] - Metric to filter for (default: 'price')
 * @property {string} [networkTimezone] - Timezone offset string (default: '+10:00')
 * @property {string} [colour] - Colour for the price line (default: '#e63946')
 * @property {string} [label] - Label for the price series (default: 'Price ($/MWh)')
 */

/**
 * Process a price/market_value API response into chart-ready data.
 *
 * @param {any} apiResponse - Raw API response ({ data: [{ metric, results: [...] }] })
 * @param {ProcessPriceDataConfig} config
 * @returns {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string> } | null}
 */
export function processPriceData(apiResponse, config) {
	if (!apiResponse?.data) return null;

	const {
		metricFilter = 'price',
		networkTimezone = '+10:00',
		colour = PRICE_COLOUR,
		label = 'Price ($/MWh)'
	} = config;

	/** @type {Map<string, Map<number, number>>} seriesId -> (timestampMs -> value) */
	const seriesMaps = new Map();

	/** @type {Set<number>} union of all timestamps */
	const allTimestamps = new Set();

	/** @type {Map<string, string>} seriesId -> label */
	const labelMap = new Map();

	for (const metric of apiResponse.data) {
		if (metric.metric !== metricFilter) continue;

		for (const series of metric.results || []) {
			const seriesId = series.name || metricFilter;

			/** @type {Map<number, number>} */
			const valueMap = new Map();

			for (const [timestamp, value] of series.data || []) {
				const stripped = stripDateTimezone(timestamp);
				const ms = new Date(stripped + networkTimezone).getTime();

				if (!isNaN(ms)) {
					valueMap.set(ms, value);
					allTimestamps.add(ms);
				}
			}

			if (valueMap.size > 0) {
				seriesMaps.set(seriesId, valueMap);
				// Use unit_code in label if available, otherwise use the default
				const unitCode = series.columns?.unit_code;
				labelMap.set(seriesId, unitCode ? `${label} — ${unitCode}` : label);
			}
		}
	}

	if (seriesMaps.size === 0) return null;

	const seriesNames = [...seriesMaps.keys()];

	/** @type {Record<string, string>} */
	const seriesLabels = {};
	/** @type {Record<string, string>} */
	const seriesColours = {};

	for (const seriesId of seriesNames) {
		seriesLabels[seriesId] = labelMap.get(seriesId) || label;
		seriesColours[seriesId] = colour;
	}

	const sortedTimestamps = [...allTimestamps].sort((a, b) => a - b);

	/** @type {any[]} */
	const data = sortedTimestamps.map((ms) => {
		/** @type {any} */
		const row = {
			date: new Date(ms),
			time: ms
		};

		for (const seriesId of seriesNames) {
			const valueMap = seriesMaps.get(seriesId);
			row[seriesId] = valueMap?.get(ms) ?? null;
		}

		return row;
	});

	return { data, seriesNames, seriesLabels, seriesColours };
}
