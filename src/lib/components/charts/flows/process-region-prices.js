/**
 * Chart processor: regional spot prices, one line per NEM region.
 *
 * Thin wrapper over the shared timestamp-union core — reads the `price`
 * metric's per-region series from a v4 market response grouped by
 * network_region. Every region present is emitted; the interconnector chart
 * narrows rendering to the corridor's two regions via `seriesNames`.
 */

import {
	collectSeriesByTimestamp,
	orderSeriesIds,
	rowsFromSeriesMaps
} from '$lib/components/charts/v2/series-rows.js';
import { regionsWithColours, regionsWithShortLabels } from '$lib/regions.js';

const REGION_ORDER = ['NSW1', 'QLD1', 'SA1', 'TAS1', 'VIC1'];

/**
 * @param {any} response - Raw API response ({ data: [{ metric, results }] })
 * @param {{ networkTimezone?: string }} [config]
 * @returns {{ data: any[], seriesNames: string[], seriesColours: Record<string, string>, seriesLabels: Record<string, string> } | null}
 */
export function processRegionPrices(response, { networkTimezone = '+10:00' } = {}) {
	const { seriesMaps, timestamps } = collectSeriesByTimestamp(response, {
		metricFilter: 'price',
		networkTimezone,
		classifySeries: (series) => {
			const region = series.columns?.region ?? series.columns?.network_region;
			return region ? { id: String(region).toUpperCase() } : null;
		}
	});

	const seriesNames = orderSeriesIds([...seriesMaps.keys()], REGION_ORDER);
	if (seriesNames.length === 0) return null;

	/** @type {Record<string, string>} */
	const seriesColours = {};
	/** @type {Record<string, string>} */
	const seriesLabels = {};
	for (const id of seriesNames) {
		const regionValue = id.toLowerCase();
		seriesColours[id] = regionsWithColours[regionValue] ?? '#5f7690';
		seriesLabels[id] = regionsWithShortLabels[regionValue] ?? id;
	}

	return {
		data: rowsFromSeriesMaps(seriesMaps, timestamps, seriesNames),
		seriesNames,
		seriesColours,
		seriesLabels
	};
}
