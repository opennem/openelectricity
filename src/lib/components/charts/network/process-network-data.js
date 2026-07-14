/**
 * Process an OE network API response into chart-ready rows for the Explorer.
 *
 * Mirrors `processFacilityPower` (real API timestamps, union + lookup, no
 * index-alignment) but keys on **fuel tech** rather than unit code, and rolls
 * individual fuel techs up into the selected grouping (Detailed / Simplified)
 * by summing per timestamp — a thin wrapper over the shared timestamp-union
 * core in v2/series-rows.js in 'sum' mode (null samples skipped so an absent
 * rooftop/other reading doesn't zero a group's sum).
 *
 *   getNetworkData(secondaryGrouping=['fueltech']) →
 *     { data: [{ metric, results: [{ columns: { fueltech }, data: [[ts, val], …] }] }] }
 *
 * Output shape matches the chart pipeline:
 *   { data: [{ date, time, group1: val, … }], seriesNames, seriesLabels, seriesColours }
 *
 * Price panels reuse the generic `processPriceData` from the facility folder —
 * it already emits the single-series line shape the chart expects, so there's no
 * network-specific price processor here.
 */

import {
	collectSeriesByTimestamp,
	orderSeriesIds,
	rowsFromSeriesMaps
} from '$lib/components/charts/v2/series-rows.js';

/**
 * @typedef {Object} ProcessNetworkDataConfig
 * @property {Record<string, string[]>} groupMap - group id → member fuel-tech codes
 * @property {string[]} groupOrder - stack order of group ids
 * @property {Record<string, string>} groupLabels - group id → display label
 * @property {string[]} [loadsToInvert] - group ids whose values should be negated
 * @property {(groupId: string) => string} getColour - returns hex colour for a group id
 * @property {string} [metricFilter] - metric to keep (default: 'power')
 * @property {string} [networkTimezone] - offset string (default: '+10:00')
 */

/**
 * @param {any} response - Raw OE API response ({ data: [{ metric, results }] })
 * @param {ProcessNetworkDataConfig} config
 * @returns {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string> } | null}
 */
export function processNetworkData(response, config) {
	if (!response?.data) return null;

	const {
		groupMap,
		groupOrder,
		groupLabels,
		loadsToInvert = [],
		getColour,
		metricFilter = 'power',
		networkTimezone = '+10:00'
	} = config;

	// Reverse lookup: fuel-tech code → group id
	/** @type {Record<string, string>} */
	const fuelTechToGroup = {};
	for (const groupId of Object.keys(groupMap)) {
		for (const ft of groupMap[groupId]) fuelTechToGroup[ft] = groupId;
	}

	const { seriesMaps, timestamps } = collectSeriesByTimestamp(response, {
		metricFilter,
		networkTimezone,
		mode: 'sum',
		shouldInvert: (groupId) => loadsToInvert.includes(groupId),
		classifySeries: (series) => {
			const fuelTech = series.columns?.fueltech || series.name;
			const groupId = fuelTechToGroup[fuelTech];
			return groupId ? { id: groupId } : null;
		}
	});

	if (seriesMaps.size === 0) return null;

	const seriesNames = orderSeriesIds([...seriesMaps.keys()], groupOrder);

	/** @type {Record<string, string>} */
	const seriesLabels = {};
	/** @type {Record<string, string>} */
	const seriesColours = {};
	for (const groupId of seriesNames) {
		seriesLabels[groupId] = groupLabels[groupId] ?? groupId;
		seriesColours[groupId] = getColour(groupId);
	}

	return {
		data: rowsFromSeriesMaps(seriesMaps, timestamps, seriesNames),
		seriesNames,
		seriesLabels,
		seriesColours
	};
}
