/**
 * Process facility power API response directly to chart-ready format.
 *
 * Unlike the old pipeline (transformFacilityPowerData → StatisticV2 → TimeSeriesV2),
 * this uses real timestamps from the API [timestamp, value] pairs and builds rows
 * by timestamp lookup. This avoids the index-alignment bug where TimeSeriesV2.transform()
 * uses the first series' start time for all series, misaligning units with different
 * start times or data lengths.
 *
 * Thin wrapper over the shared timestamp-union core in v2/series-rows.js, keyed
 * on unit code with values stored as-is (nulls included).
 *
 * Output shape matches the existing chart pipeline:
 *   { data: [{date, time, series1: val, ...}], seriesNames, seriesLabels, seriesColours }
 */

import {
	collectSeriesByTimestamp,
	orderSeriesIds,
	rowsFromSeriesMaps
} from '$lib/components/charts/v2/series-rows.js';

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

	const { seriesMaps, seriesMeta, timestamps } = collectSeriesByTimestamp(powerResponse, {
		metricFilter,
		networkTimezone,
		mode: 'set',
		shouldInvert: (seriesId) => loadsToInvert.includes(seriesId),
		classifySeries: (series) => {
			const unitCode = series.columns?.unit_code || series.name?.replace(`${metricFilter}_`, '');
			if (!(unitCode in unitFuelTechMap)) return null;
			return {
				id: series.name || `${metricFilter}_${unitCode}`,
				meta: { unitCode, fuelTech: unitFuelTechMap[unitCode] }
			};
		}
	});

	if (seriesMaps.size === 0) return null;

	const seriesNames = orderSeriesIds([...seriesMaps.keys()], unitOrder);

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

	return {
		data: rowsFromSeriesMaps(seriesMaps, timestamps, seriesNames),
		seriesNames,
		seriesLabels,
		seriesColours
	};
}
