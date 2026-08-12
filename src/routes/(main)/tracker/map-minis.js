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
import { peakBucket } from '$lib/components/charts/facility/metrics/metrics-calc.js';

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
 * Collect a response's fuel-tech series onto Simplified groups, keyed on real
 * epoch ms via the network offset. `region: null` accepts every series —
 * `mode: 'sum'` then folds a region-grouped response's regions into one
 * value per group.
 * @param {any} response
 * @param {'power' | 'emissions'} metric
 * @param {string} networkTimezone
 * @param {string | null} region
 */
function collectFuelTechSeries(response, metric, networkTimezone, region) {
	const invertLoads = metric === 'power';
	return collectSeriesByTimestamp(response, {
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
}

/**
 * Order, label, colour and display-aggregate collected group series into the
 * mini-chart shape.
 * @param {Map<string, Map<number, number>>} seriesMaps
 * @param {Set<number> | number[]} timestamps
 * @param {'power' | 'emissions'} metric
 * @param {string} ianaTimeZone
 */
function finaliseFuelTechSeries(seriesMaps, timestamps, metric, ianaTimeZone) {
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

	const { seriesMaps, timestamps } = collectFuelTechSeries(
		response,
		metric,
		networkTimezone,
		region
	);
	if (seriesMaps.size === 0) return null;

	return finaliseFuelTechSeries(seriesMaps, timestamps, metric, ianaTimeZone);
}

/**
 * Merged NEM+WEM national series for the All-Australia card.
 *
 * The API's AU network joins the two grids on naive wall-clock strings, which
 * displaces WEM by two real hours and leaves the newest ~2h NEM-only — so the
 * national sum is built here instead. Each response is collected with its own
 * offset (rows key on real epoch ms, so buckets align on absolute time), the
 * region-grouped NEM response summing all five regions per Simplified group in
 * one pass, then WEM's values are added per instant. The merged rows are
 * trimmed to the two networks' overlap so the stack can't cliff by WEM's
 * contribution at a ragged live edge. A missing/failed WEM response degrades
 * to the untrimmed NEM-only sum — the same failure that silently drops the
 * WEM card.
 *
 * No national spot price exists, so `metric: 'price'` returns null.
 *
 * @param {any} nemResponse - Region-grouped NEM response
 * @param {any} wemResponse - Single-region WEM response (null on fetch failure)
 * @param {{ metric: 'power' | 'price' | 'emissions' }} config
 * @returns {ReturnType<typeof miniSeriesForRegion>}
 */
export function miniSeriesForAu(nemResponse, wemResponse, { metric }) {
	if (metric === 'price') return null;

	const nem = collectFuelTechSeries(nemResponse, metric, '+10:00', null);
	if (nem.seriesMaps.size === 0) return null;
	const wem = collectFuelTechSeries(wemResponse, metric, '+08:00', null);

	for (const [groupId, wemMap] of wem.seriesMaps) {
		let target = nem.seriesMaps.get(groupId);
		if (!target) {
			target = new Map();
			nem.seriesMaps.set(groupId, target);
		}
		for (const [ms, value] of wemMap) target.set(ms, (target.get(ms) ?? 0) + value);
	}

	/** @type {Set<number> | number[]} */
	let timestamps = nem.timestamps;
	if (wem.timestamps.size > 0) {
		const start = Math.max(Math.min(...nem.timestamps), Math.min(...wem.timestamps));
		const end = Math.min(Math.max(...nem.timestamps), Math.max(...wem.timestamps));
		for (const ms of wem.timestamps) nem.timestamps.add(ms);
		timestamps = [...nem.timestamps].filter((ms) => ms >= start && ms <= end);
	}

	// Brisbane buckets deliberately — no DST, and they match the NEM cards' 30m
	// edges; WEM's whole-hour offset lands cleanly on them.
	return finaliseFuelTechSeries(nem.seriesMaps, timestamps, metric, 'Australia/Brisbane');
}

/**
 * Stacked total of a processed mini-series' newest display bucket — the sum
 * of the last row's source values (loads are negative and excluded), for the
 * All-Australia card's header. Null when there's nothing to show.
 *
 * @param {ReturnType<typeof miniSeriesForRegion>} processed
 * @returns {number | null}
 */
export function latestStackedTotal(processed) {
	if (!processed?.data.length) return null;
	const rows = processed.data;
	const total = peakBucket([rows[rows.length - 1]], processed.seriesNames)?.value ?? 0;
	return total > 0 ? total : null;
}
