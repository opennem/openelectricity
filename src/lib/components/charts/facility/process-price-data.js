/**
 * Process facility price/market_value API response into chart-ready format.
 *
 * Unlike processFacilityPower, this doesn't require unit-to-fuel-tech mapping.
 * Handles single-series data (e.g. regional spot price) as well as per-unit
 * series that may not match the facility's unit map. A thin wrapper over the
 * shared timestamp-union core in v2/series-rows.js ('set' mode, no inversion).
 *
 * Output shape matches the chart pipeline:
 *   { data: [{date, time, series1: val, ...}], seriesNames, seriesLabels, seriesColours }
 */

import {
	collectSeriesByTimestamp,
	rowsFromSeriesMaps
} from '$lib/components/charts/v2/series-rows.js';
import { LINE_COLOUR } from './colours.js';

/**
 * @typedef {Object} ProcessPriceDataConfig
 * @property {string} [metricFilter] - Metric to filter for (default: 'price')
 * @property {string} [networkTimezone] - Timezone offset string (default: '+10:00')
 * @property {string} [colour] - Colour for the price line (default: LINE_COLOUR)
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
		colour = LINE_COLOUR,
		label = 'Price ($/MWh)'
	} = config;

	const { seriesMaps, seriesMeta, timestamps } = collectSeriesByTimestamp(apiResponse, {
		metricFilter,
		networkTimezone,
		mode: 'set',
		classifySeries: (series) => {
			// Use unit_code in the label if available, otherwise the default
			const unitCode = series.columns?.unit_code;
			return {
				id: series.name || metricFilter,
				meta: unitCode ? `${label} — ${unitCode}` : label
			};
		}
	});

	if (seriesMaps.size === 0) return null;

	const seriesNames = [...seriesMaps.keys()];

	/** @type {Record<string, string>} */
	const seriesLabels = {};
	/** @type {Record<string, string>} */
	const seriesColours = {};

	for (const seriesId of seriesNames) {
		seriesLabels[seriesId] = seriesMeta.get(seriesId) || label;
		seriesColours[seriesId] = colour;
	}

	return {
		data: rowsFromSeriesMaps(seriesMaps, timestamps, seriesNames),
		seriesNames,
		seriesLabels,
		seriesColours
	};
}
