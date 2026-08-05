/**
 * Processing for the map view's on-anchor mini charts.
 *
 * One region-grouped OE response (`primary_grouping=network_region` +
 * fueltech) carries every NEM region's series; WEM arrives as its own
 * single-region response. `miniSeriesForRegion` extracts ONE region's
 * chart-ready rows from either shape — Simplified fuel-tech grouping for
 * generation/emissions (Detailed is unreadable at mini size), a single line
 * for price — display-aggregated from the native 5m onto 30m buckets.
 *
 * Loads invert for generation (the minis share the homepage stack visual —
 * loads pull the area below zero) but not for emissions, which are only ever
 * produced.
 */

import simple from '$lib/fuel-tech-groups/simple';
import { loadFuelTechs } from '$lib/fuel_techs';
import { getFuelTechColour } from '$lib/components/charts/colours.js';
import {
	collectSeriesByTimestamp,
	orderSeriesIds,
	rowsFromSeriesMaps
} from '$lib/components/charts/v2/series-rows.js';
import { aggregateForDisplay } from '$lib/components/charts/v2/dataProcessing.js';

/** @type {'power' | 'price' | 'emissions'} */
export const DEFAULT_MINI_METRIC = 'power';

export const MINI_METRIC_OPTIONS = /** @type {const} */ ([
	{ label: 'Generation', value: 'power' },
	{ label: 'Price', value: 'price' },
	{ label: 'Emissions', value: 'emissions' }
]);

const PRICE_SERIES_ID = 'price';
const PRICE_COLOUR = '#8b5cf6';

// Reverse lookup: fuel-tech code → Simplified group id.
/** @type {Record<string, string>} */
const FT_TO_SIMPLE_GROUP = {};
for (const groupId of Object.keys(simple.fuelTechs)) {
	for (const ft of simple.fuelTechs[groupId]) FT_TO_SIMPLE_GROUP[ft] = groupId;
}

/**
 * Match a series to a region. Region-grouped responses carry
 * `columns.region`; single-region responses (WEM, or a region-filtered fetch)
 * carry none — pass `region: null` to accept everything.
 * @param {any} series
 * @param {string | null} region
 */
function seriesInRegion(series, region) {
	if (region === null) return true;
	const seriesRegion = series.columns?.region ?? series.name?.split('|')[0]?.split('_').pop();
	return seriesRegion === region;
}

/**
 * @typedef {Object} MiniSeriesConfig
 * @property {'power' | 'price' | 'emissions'} metric
 * @property {string | null} region - Region code ('NSW1'…) in a grouped
 *   response, or null to take every series (single-region response)
 * @property {string} [networkTimezone] - Offset string (default '+10:00')
 * @property {string} [ianaTimeZone] - IANA zone for bucket alignment
 *   (default 'Australia/Brisbane')
 */

/**
 * @param {any} response - Raw OE API response ({ data: [{ metric, results }] })
 * @param {MiniSeriesConfig} config
 * @returns {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string> } | null}
 */
export function miniSeriesForRegion(response, config) {
	if (!response?.data) return null;

	const {
		metric,
		region,
		networkTimezone = '+10:00',
		ianaTimeZone = 'Australia/Brisbane'
	} = config;

	if (metric === 'price') {
		const { seriesMaps, timestamps } = collectSeriesByTimestamp(response, {
			metricFilter: 'price',
			networkTimezone,
			mode: 'sum',
			shouldInvert: () => false,
			classifySeries: (series) => (seriesInRegion(series, region) ? { id: PRICE_SERIES_ID } : null)
		});
		if (seriesMaps.size === 0) return null;
		const nativePriceRows = rowsFromSeriesMaps(seriesMaps, timestamps, [PRICE_SERIES_ID]);
		return {
			data: aggregateForDisplay(nativePriceRows, [PRICE_SERIES_ID], {
				apiInterval: '5m',
				displayInterval: '30m',
				ianaTimeZone,
				method: 'mean'
			}),
			seriesNames: [PRICE_SERIES_ID],
			seriesLabels: { [PRICE_SERIES_ID]: 'Price' },
			seriesColours: { [PRICE_SERIES_ID]: PRICE_COLOUR }
		};
	}

	const invertLoads = metric === 'power';
	const { seriesMaps, timestamps } = collectSeriesByTimestamp(response, {
		metricFilter: metric,
		networkTimezone,
		mode: 'sum',
		shouldInvert: (groupId) => invertLoads && loadFuelTechs.includes(groupId),
		classifySeries: (series) => {
			if (!seriesInRegion(series, region)) return null;
			const fuelTech = series.columns?.fueltech || series.name;
			// The aggregate battery series nets its charging/discharging splits —
			// the Simplified group maps the splits, so the aggregate double-counts.
			if (fuelTech === 'battery') return null;
			const groupId = FT_TO_SIMPLE_GROUP[fuelTech];
			return groupId ? { id: groupId } : null;
		}
	});
	if (seriesMaps.size === 0) return null;

	const seriesNames = orderSeriesIds([...seriesMaps.keys()], simple.order);
	/** @type {Record<string, string>} */
	const seriesLabels = {};
	/** @type {Record<string, string>} */
	const seriesColours = {};
	for (const groupId of seriesNames) {
		seriesLabels[groupId] = simple.labels[groupId] ?? groupId;
		seriesColours[groupId] = getFuelTechColour(groupId);
	}

	const nativeRows = rowsFromSeriesMaps(seriesMaps, timestamps, seriesNames);
	return {
		// Per-bucket tonnes sum; instantaneous MW average.
		data: aggregateForDisplay(nativeRows, seriesNames, {
			apiInterval: '5m',
			displayInterval: '30m',
			ianaTimeZone,
			method: metric === 'emissions' ? 'sum' : 'mean'
		}),
		seriesNames,
		seriesLabels,
		seriesColours
	};
}
