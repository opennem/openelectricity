/**
 * Process facility power API response directly to chart-ready format.
 *
 * Unlike the old pipeline (transformFacilityPowerData → StatisticV2 → TimeSeriesV2),
 * this uses real timestamps from the API [timestamp, value] pairs and builds rows
 * by timestamp lookup. This avoids the index-alignment bug where TimeSeriesV2.transform()
 * uses the first series' start time for all series, misaligning units with different
 * start times or data lengths.
 *
 * Output shape matches the existing chart pipeline:
 *   { data: [{date, time, series1: val, ...}], seriesNames, seriesLabels, seriesColours }
 */

import { stripDateTimezone } from '$lib/utils/date-format.js';

/**
 * @typedef {Object} ProcessFacilityPowerConfig
 * @property {Record<string, string>} unitFuelTechMap - Map unit code → fuel tech
 * @property {string[]} [unitOrder] - Desired series ordering (e.g. ['power_UNIT1', 'power_UNIT2'])
 * @property {string[]} [loadsToInvert] - Series IDs whose values should be negated
 * @property {(unitCode: string, fuelTech: string) => string} getLabel - Returns display label for a unit
 * @property {(unitCode: string, fuelTech: string) => string} getColour - Returns hex colour for a unit
 * @property {string} [metricFilter] - Metric to filter for (default: 'power')
 * @property {string} [networkTimezone] - Timezone offset string (default: '+10:00')
 */

/**
 * Process a facility power API response into chart-ready data.
 *
 * @param {any} powerResponse - Raw API response ({ data: [{ metric, results: [...] }] })
 * @param {ProcessFacilityPowerConfig} config
 * @returns {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string> } | null}
 */
export function processFacilityPower(powerResponse, config) {
	if (!powerResponse?.data) return null;

	const {
		unitFuelTechMap,
		unitOrder = [],
		loadsToInvert = [],
		getLabel,
		getColour,
		metricFilter = 'power',
		networkTimezone = '+10:00'
	} = config;

	/** @type {Map<string, Map<number, number>>} seriesId → (timestampMs → value) */
	const seriesMaps = new Map();

	/** @type {Set<number>} union of all timestamps */
	const allTimestamps = new Set();

	/** @type {Map<string, {unitCode: string, fuelTech: string}>} seriesId → metadata */
	const seriesMeta = new Map();

	// 1. Iterate API results and build per-series timestamp→value maps
	for (const metric of powerResponse.data) {
		if (metric.metric !== metricFilter) continue;

		for (const series of metric.results || []) {
			const unitCode = series.columns?.unit_code || series.name?.replace(`${metricFilter}_`, '');
			if (!(unitCode in unitFuelTechMap)) continue;
			const fuelTech = unitFuelTechMap[unitCode];
			const seriesId = series.name || `${metricFilter}_${unitCode}`;
			const shouldInvert = loadsToInvert.includes(seriesId);

			/** @type {Map<number, number>} */
			const valueMap = new Map();

			for (const [timestamp, value] of series.data || []) {
				// Parse timestamp: strip timezone then treat as local time with network offset
				const stripped = stripDateTimezone(timestamp);
				const ms = new Date(stripped + networkTimezone).getTime();

				if (!isNaN(ms)) {
					valueMap.set(ms, shouldInvert && value != null ? -value : value);
					allTimestamps.add(ms);
				}
			}

			if (valueMap.size > 0) {
				seriesMaps.set(seriesId, valueMap);
				seriesMeta.set(seriesId, { unitCode, fuelTech });
			}
		}
	}

	if (seriesMaps.size === 0) return null;

	// 2. Determine series order
	const allSeriesIds = [...seriesMaps.keys()];

	/** @type {string[]} */
	let seriesNames;
	if (unitOrder.length > 0) {
		// Use provided order, then append any extras not in the order
		const ordered = unitOrder.filter((id) => seriesMaps.has(id));
		const extras = allSeriesIds.filter((id) => !unitOrder.includes(id));
		seriesNames = [...ordered, ...extras];
	} else {
		seriesNames = allSeriesIds;
	}

	// 3. Build labels and colours
	/** @type {Record<string, string>} */
	const seriesLabels = {};
	/** @type {Record<string, string>} */
	const seriesColours = {};

	for (const seriesId of seriesNames) {
		const meta = seriesMeta.get(seriesId);
		if (meta) {
			seriesLabels[seriesId] = getLabel(meta.unitCode, meta.fuelTech);
			seriesColours[seriesId] = getColour(meta.unitCode, meta.fuelTech);
		}
	}

	// 4. Sort timestamps and build rows
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
