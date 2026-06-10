/**
 * Process an OE network API response into chart-ready rows for the Explorer.
 *
 * Mirrors `processFacilityPower` (real API timestamps, union + lookup, no
 * index-alignment) but keys on **fuel tech** rather than unit code, and rolls
 * individual fuel techs up into the selected grouping (Detailed / Simplified)
 * by summing per timestamp.
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

import { stripDateTimezone } from '$lib/utils/date-format.js';

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

	/** @type {Map<string, Map<number, number>>} groupId → (timestampMs → summed value) */
	const groupMaps = new Map();
	/** @type {Set<number>} union of all timestamps */
	const allTimestamps = new Set();

	for (const metric of response.data) {
		if (metric.metric !== metricFilter) continue;

		for (const series of metric.results || []) {
			const fuelTech = series.columns?.fueltech || series.name;
			const groupId = fuelTechToGroup[fuelTech];
			if (!groupId) continue;
			const shouldInvert = loadsToInvert.includes(groupId);

			let valueMap = groupMaps.get(groupId);
			if (!valueMap) {
				valueMap = new Map();
				groupMaps.set(groupId, valueMap);
			}

			for (const [timestamp, value] of series.data || []) {
				if (value == null) continue;
				const ms = new Date(stripDateTimezone(timestamp) + networkTimezone).getTime();
				if (isNaN(ms)) continue;

				const signed = shouldInvert ? -value : value;
				valueMap.set(ms, (valueMap.get(ms) ?? 0) + signed);
				allTimestamps.add(ms);
			}
		}
	}

	if (groupMaps.size === 0) return null;

	// Series order: configured order first, then any extras seen in the data
	const present = [...groupMaps.keys()];
	const ordered = groupOrder.filter((id) => groupMaps.has(id));
	const extras = present.filter((id) => !groupOrder.includes(id));
	const seriesNames = [...ordered, ...extras];

	/** @type {Record<string, string>} */
	const seriesLabels = {};
	/** @type {Record<string, string>} */
	const seriesColours = {};
	for (const groupId of seriesNames) {
		seriesLabels[groupId] = groupLabels[groupId] ?? groupId;
		seriesColours[groupId] = getColour(groupId);
	}

	const sortedTimestamps = [...allTimestamps].sort((a, b) => a - b);
	/** @type {any[]} */
	const data = sortedTimestamps.map((ms) => {
		/** @type {any} */
		const row = { date: new Date(ms), time: ms };
		for (const groupId of seriesNames) {
			row[groupId] = groupMaps.get(groupId)?.get(ms) ?? null;
		}
		return row;
	});

	return { data, seriesNames, seriesLabels, seriesColours };
}
