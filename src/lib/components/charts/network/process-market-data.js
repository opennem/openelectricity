/**
 * Process a multi-metric market API response (demand, curtailment, flows) into
 * chart-ready format.
 *
 * `/api/network/data` fans a public metric like `curtailment` out to several OE
 * market metrics (`curtailment_solar_utility` + `curtailment_wind`); each comes
 * back as its own `data[]` entry. This processor maps one configured series def
 * per OE metric onto the shared timestamp-union core, so the output shape
 * matches the rest of the chart pipeline:
 *   { data: [{date, time, series1: val, ...}], seriesNames, seriesLabels, seriesColours }
 */

import {
	collectSeriesByTimestamp,
	rowsFromSeriesMaps
} from '$lib/components/charts/v2/series-rows.js';

/**
 * @typedef {Object} MarketSeriesDef
 * @property {string} metric - OE metric name in the response (e.g. 'curtailment_wind')
 * @property {string} id - Series id used in chart rows
 * @property {string} label - Legend/tooltip label
 * @property {string} colour - Series colour
 * @property {boolean} [invert] - Negate values (e.g. exports in a diverging flows stack)
 */

/**
 * @typedef {Object} ProcessMarketDataConfig
 * @property {MarketSeriesDef[]} seriesDefs - One def per OE metric to read
 * @property {string} [networkTimezone] - Timezone offset string (default: '+10:00')
 */

/**
 * @param {any} apiResponse - Raw API response ({ data: [{ metric, results: [...] }] })
 * @param {ProcessMarketDataConfig} config
 * @returns {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string> } | null}
 */
export function processMarketData(apiResponse, config) {
	if (!apiResponse?.data) return null;

	const { seriesDefs, networkTimezone = '+10:00' } = config;

	/** @type {Map<string, Map<number, number>>} */
	const mergedMaps = new Map();
	/** @type {Set<number>} */
	const mergedTimestamps = new Set();
	/** @type {string[]} */
	const seriesNames = [];
	/** @type {Record<string, string>} */
	const seriesLabels = {};
	/** @type {Record<string, string>} */
	const seriesColours = {};

	for (const def of seriesDefs) {
		const { seriesMaps, timestamps } = collectSeriesByTimestamp(apiResponse, {
			metricFilter: def.metric,
			networkTimezone,
			mode: 'sum',
			shouldInvert: () => Boolean(def.invert),
			classifySeries: () => ({ id: def.id })
		});

		const valueMap = seriesMaps.get(def.id);
		if (!valueMap || valueMap.size === 0) continue;

		mergedMaps.set(def.id, valueMap);
		for (const ms of timestamps) mergedTimestamps.add(ms);
		seriesNames.push(def.id);
		seriesLabels[def.id] = def.label;
		seriesColours[def.id] = def.colour;
	}

	if (seriesNames.length === 0) return null;

	return {
		data: rowsFromSeriesMaps(mergedMaps, mergedTimestamps, seriesNames),
		seriesNames,
		seriesLabels,
		seriesColours
	};
}
