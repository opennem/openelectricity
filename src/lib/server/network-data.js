/**
 * Shared server logic for the network-data endpoint and the admin
 * network-cache endpoints: the OE client, the keyed SWR edge-cache instance
 * (with D1 registry hooks), parameter validation/canonicalisation, and
 * upstream fetch construction. `/api/network/data` serves the public tracker;
 * `/api/admin/network-cache/*` inspects and refreshes the same cache.
 */

import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
import { MARKET_METRIC_NAMES } from '$lib/components/charts/network/market-metric-names.js';
import { apiRangeLimitError } from '$lib/oe-api/data-limits.js';
import { createKeyedSwrCache } from '$lib/server/keyed-swr-cache.js';
import {
	recordRefreshError,
	recordStored,
	registryDb
} from '$lib/server/network-cache-registry.js';
import { auUpstreamRanges, mergeAuResponses } from '$lib/server/network-data-au.js';
import { isHistoricalWindow } from '$lib/utils/date-range.js';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export const NETWORK_DATA_KEY_PREFIX = 'https://edge-cache.openelectricity.org.au/network-data-v1';

/** Refresh live windows every five minutes. */
export const LIVE_FRESH_MS = 5 * 60 * 1000;
/** Refresh historical windows every six hours. */
export const HISTORICAL_FRESH_MS = 6 * 60 * 60 * 1000;

/**
 * Return the freshness period for a network-local `date_end`.
 * @param {string | undefined} dateEnd
 * @returns {number}
 */
export function freshnessFor(dateEnd) {
	return isHistoricalWindow(dateEnd) ? HISTORICAL_FRESH_MS : LIVE_FRESH_MS;
}

/**
 * Cache successful responses by canonical query and refresh stale values in
 * the background. Vite development bypasses the edge cache. In deployed
 * environments, lifecycle hooks copy cache-write metadata and the latest
 * upstream failure into D1; that bookkeeping is best-effort and cannot change
 * the public response.
 */
export const networkDataCache = createKeyedSwrCache({
	keyPrefix: NETWORK_DATA_KEY_PREFIX,
	onStored: async ({ platform, key, storedAt, sizeBytes, durationMs }) => {
		const db = registryDb(platform);
		if (!db) return;
		await recordStored(db, { ...describeCacheKey(key), storedAt, sizeBytes, durationMs });
	},
	onRefreshError: async ({ platform, key, error }) => {
		const db = registryDb(platform);
		if (!db) return;
		await recordRefreshError(db, {
			cacheKey: `${NETWORK_DATA_KEY_PREFIX}?${key}`,
			message: String(/** @type {any} */ (error)?.message ?? error),
			at: Date.now()
		});
	}
});

/**
 * @param {object} params
 * @param {string} params.region
 * @param {string} params.metric
 * @param {string} params.interval
 * @param {string} [params.dateStart]
 * @param {string} [params.dateEnd]
 * @param {string} [params.primaryGrouping]
 */
export function cacheKeyFor({ region, metric, interval, dateStart, dateEnd, primaryGrouping }) {
	const params = new URLSearchParams({ region, metric, interval });
	if (dateStart) params.set('date_start', dateStart);
	if (dateEnd) params.set('date_end', dateEnd);
	if (primaryGrouping) params.set('primary_grouping', primaryGrouping);
	return params.toString();
}

export const VALID_REGIONS = new Set(['au', '_all', 'wem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1']);
export const VALID_INTERVALS = new Set(['5m', '1h', '1d', '7d', '1M', '3M', '1y']);
const VALID_DATA_METRICS = new Set([
	'power',
	'energy',
	'market_value',
	'emissions',
	'emissions_intensity',
	'price_vw'
]);
const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?$/;

/**
 * @param {string} metric
 * @returns {boolean}
 */
export function isValidMetric(metric) {
	return VALID_DATA_METRICS.has(metric) || Object.hasOwn(MARKET_METRIC_NAMES, metric);
}

/**
 * @typedef {object} NetworkDataParams
 * @property {string} region
 * @property {string} metric
 * @property {string} interval
 * @property {string} [dateStart]
 * @property {string} [dateEnd]
 * @property {string} [primaryGrouping]
 * @property {import('openelectricity').NetworkCode} networkId
 * @property {string} [networkRegion]
 */

/**
 * Default and validate the endpoint's query parameters. Returns the first
 * failing message (every failure is a 400) or the canonical parameter set.
 *
 * @param {URLSearchParams} searchParams
 * @returns {{ params: NetworkDataParams } | { error: string }}
 */
export function parseNetworkDataParams(searchParams) {
	const region = searchParams.get('region') || '_all';
	const metric = searchParams.get('metric') || 'power';
	const interval = searchParams.get('interval') || '5m';
	const dateStart = searchParams.get('date_start') || undefined;
	const dateEnd = searchParams.get('date_end') || undefined;
	const primaryGrouping = searchParams.get('primary_grouping') || undefined;

	if (!VALID_REGIONS.has(region)) {
		return { error: `Invalid region: ${region}` };
	}
	if (!VALID_INTERVALS.has(interval)) {
		return { error: `Invalid interval: ${interval}` };
	}
	if (!isValidMetric(metric)) {
		return { error: `Invalid metric: ${metric}` };
	}
	if (primaryGrouping && primaryGrouping !== 'network_region') {
		return { error: `Invalid primary grouping: ${primaryGrouping}` };
	}
	if (
		(dateStart && !LOCAL_DATE_TIME.test(dateStart)) ||
		(dateEnd && !LOCAL_DATE_TIME.test(dateEnd)) ||
		(dateStart && dateEnd && dateStart >= dateEnd)
	) {
		return { error: 'Invalid date range.' };
	}
	if (region === 'au' && metric === 'price') {
		return { error: 'A national spot price is not available.' };
	}
	const rangeError = apiRangeLimitError(interval, dateStart, dateEnd);
	if (rangeError) return { error: rangeError };

	const { networkId, networkRegion } = regionToNetwork(region);
	return {
		params: {
			region,
			metric,
			interval,
			dateStart,
			dateEnd,
			primaryGrouping,
			networkId,
			networkRegion
		}
	};
}

/**
 * Registry metadata for a canonical query string (the portion of the
 * synthetic cache key after `?`). Live/historical and freshness are
 * classified at call time, mirroring how the endpoint stores the entry.
 *
 * @param {string} canonicalQuery
 */
export function describeCacheKey(canonicalQuery) {
	const params = new URLSearchParams(canonicalQuery);
	const dateEnd = params.get('date_end') ?? undefined;
	return {
		cacheKey: `${NETWORK_DATA_KEY_PREFIX}?${canonicalQuery}`,
		canonicalQuery,
		region: params.get('region') ?? '',
		metric: params.get('metric') ?? '',
		interval: params.get('interval') ?? '',
		dateStart: params.get('date_start') ?? undefined,
		dateEnd,
		primaryGrouping: params.get('primary_grouping') ?? undefined,
		isHistorical: isHistoricalWindow(dateEnd),
		freshMs: freshnessFor(dateEnd)
	};
}

/**
 * Validate a full synthetic cache key supplied by the admin UI. The key must
 * carry the exact prefix, parse to valid parameters, and round-trip through
 * `cacheKeyFor` unchanged (rejecting reordered or extra parameters).
 *
 * @param {string} fullKey
 * @returns {{ canonical: string, params: NetworkDataParams } | null}
 */
export function parseRegisteredKey(fullKey) {
	if (typeof fullKey !== 'string') return null;
	const prefix = `${NETWORK_DATA_KEY_PREFIX}?`;
	if (!fullKey.startsWith(prefix)) return null;
	const canonical = fullKey.slice(prefix.length);
	const parsed = parseNetworkDataParams(new URLSearchParams(canonical));
	if ('error' in parsed) return null;
	if (cacheKeyFor(parsed.params) !== canonical) return null;
	return { canonical, params: parsed.params };
}

/**
 * @param {string} metric
 * @param {string} interval
 * @returns {import('openelectricity').DataMetric[]}
 */
function dataMetricsFor(metric, interval) {
	if (metric === 'emissions_intensity') {
		const fine = interval === '5m' || interval === '1h';
		return ['emissions', fine ? 'power' : 'energy'];
	}
	if (metric === 'price_vw') {
		// The client derives the ratio after aggregating both components.
		const fine = interval === '5m' || interval === '1h';
		return ['market_value', fine ? 'power' : 'energy'];
	}
	return [/** @type {import('openelectricity').DataMetric} */ (metric)];
}

/**
 * One upstream OE call for a single network — the shared leg of both the
 * single-network path and the 'au' NEM+WEM merge.
 *
 * @param {Object} params
 * @param {import('openelectricity').NetworkCode} params.networkId
 * @param {string} [params.networkRegion]
 * @param {string} params.metric
 * @param {string} params.interval
 * @param {string} [params.dateStart]
 * @param {string} [params.dateEnd]
 * @param {string} [params.primaryGrouping]
 */
async function fetchNetworkResponse({
	networkId,
	networkRegion,
	metric,
	interval,
	dateStart,
	dateEnd,
	primaryGrouping
}) {
	const marketMetrics = MARKET_METRIC_NAMES[metric];

	if (marketMetrics) {
		/** @type {import('openelectricity').IMarketTimeSeriesParams} */
		const options = {
			interval: /** @type {any} */ (interval),
			dateStart,
			dateEnd,
			network_region: networkRegion
		};
		if (primaryGrouping === 'network_region') options.primaryGrouping = 'network_region';
		const { response } = await client.getMarket(networkId, marketMetrics, options);
		return response;
	}

	/** @type {import('openelectricity').INetworkTimeSeriesParams} */
	const options = {
		interval: /** @type {any} */ (interval),
		dateStart,
		dateEnd,
		network_region: networkRegion,
		secondaryGrouping: ['fueltech']
	};
	if (primaryGrouping === 'network_region') options.primaryGrouping = 'network_region';
	const { response } = await client.getNetworkData(
		networkId,
		dataMetricsFor(metric, interval),
		options
	);
	return response;
}

/**
 * Build the upstream fetcher for a canonical parameter set. Failures are not
 * cached — the fetcher throws and the SWR cache stores nothing.
 *
 * @param {NetworkDataParams} params
 * @returns {() => Promise<{ region: string, network_id: string, response: any }>}
 */
export function makeUpstreamFetcher(params) {
	const {
		region,
		metric,
		interval,
		dateStart,
		dateEnd,
		primaryGrouping,
		networkId,
		networkRegion
	} = params;

	return async () => {
		let response;

		if (region === 'au' && metric !== 'price') {
			// All Regions: NEM+WEM merged server-side (see network-data-au.js —
			// the OE API's own AU network joins the grids on wall-clock strings,
			// displacing WEM by 2 real hours). The WEM leg degrades to NEM-only
			// on failure; a NEM failure falls through to the usual handlers.
			const ranges = auUpstreamRanges(interval, dateStart, dateEnd);
			const [nemResponse, wemResponse] = await Promise.all([
				fetchNetworkResponse({ networkId: 'NEM', metric, interval, ...ranges.nem }),
				fetchNetworkResponse({ networkId: 'WEM', metric, interval, ...ranges.wem }).catch((err) => {
					if (!(err instanceof NoDataFound)) console.error('WEM leg of au fetch failed:', err);
					return null;
				})
			]);
			response = mergeAuResponses(nemResponse, wemResponse, interval);
		} else {
			// 'au' price resolves to the whole-NEM series — no national spot
			// price exists, so serving NEM keeps the endpoint total (the tracker
			// hides its price panel for 'au').
			const upstream =
				region === 'au'
					? { networkId: /** @type {import('openelectricity').NetworkCode} */ ('NEM') }
					: { networkId, networkRegion };
			response = await fetchNetworkResponse({
				...upstream,
				metric,
				interval,
				dateStart,
				dateEnd,
				primaryGrouping
			});
		}

		return { region, network_id: networkId, response };
	};
}
