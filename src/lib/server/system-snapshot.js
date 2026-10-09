import { HOURS_MS, nemNaiveRange } from '$lib/flows/nem-time.js';
import { makeUpstreamFetcher, parseNetworkDataParams } from '$lib/server/network-data.js';
import { createSwrCache } from '$lib/server/swr-cache.js';
import {
	NEM_SNAPSHOT_REGIONS,
	lastTwelveMonths,
	summariseAnnual,
	summariseLive
} from '$lib/server/system-snapshot-summary.js';

/**
 * Homepage System Snapshot data, from the OE v4 API through the Tracker's
 * network-data queries.
 *
 * The homepage is the busiest page, so each mode is SWR-cached as its finished
 * per-region figures (a few numbers per region): a request is served from the
 * isolate or the Cloudflare Cache API and never waits on OE once warm. A
 * refresh costs two OE calls for live (NEM split by region) and four for
 * annual (NEM split by region, plus WEM).
 */

const ANNUAL_FRESH_MS = 6 * HOURS_MS;
const LIVE_FRESH_MS = 5 * 60 * 1000;
const ANNUAL_REGIONS = [...NEM_SNAPSHOT_REGIONS, 'WA'];

/**
 * One OE response through the Tracker's network-data query path (validation,
 * metric fan-out, region mapping).
 * @param {Record<string, string>} query - `/api/network/data` query parameters
 */
async function fetchNetwork(query) {
	const parsed = parseNetworkDataParams(new URLSearchParams(query));
	if ('error' in parsed) throw new Error(parsed.error);
	const { response } = await makeUpstreamFetcher(parsed.params)();
	return response;
}

/** @param {Record<string, unknown>} regions @param {string[]} ids */
const hasRegions = (regions, ids) => ids.every((id) => regions[id]);

/**
 * @typedef {{ period?: string, regions: Record<string, import('$lib/server/system-snapshot-summary.js').AnnualRegion>, error?: string }} AnnualSnapshot
 * @typedef {{ regions: Record<string, import('$lib/server/system-snapshot-summary.js').LiveRegion>, error?: string }} LiveSnapshot
 */

/** @returns {Promise<AnnualSnapshot>} */
async function fetchAnnual() {
	try {
		const nem = lastTwelveMonths('+10:00');
		const wem = lastTwelveMonths('+08:00');
		const nemQuery = {
			region: '_all',
			interval: '1M',
			date_start: nem.dateStart,
			date_end: nem.dateEnd,
			primary_grouping: 'network_region'
		};
		const wemQuery = {
			region: 'wem',
			interval: '1M',
			date_start: wem.dateStart,
			date_end: wem.dateEnd
		};
		const [nemGeneration, nemRenewables, wemGeneration, wemRenewables] = await Promise.all([
			fetchNetwork({ ...nemQuery, metric: 'emissions_intensity' }),
			fetchNetwork({ ...nemQuery, metric: 'renewables_energy' }),
			fetchNetwork({ ...wemQuery, metric: 'emissions_intensity' }),
			fetchNetwork({ ...wemQuery, metric: 'renewables_energy' })
		]);
		return {
			period: nem.dateEnd,
			regions: {
				...summariseAnnual(nemGeneration, nemRenewables),
				...summariseAnnual(wemGeneration, wemRenewables, 'WA')
			}
		};
	} catch (err) {
		console.error('Error loading annual system snapshot:', err);
		return { regions: {}, error: 'Error loading annual system snapshot.' };
	}
}

/** @returns {Promise<LiveSnapshot>} */
async function fetchLive() {
	try {
		const { dateStart, dateEnd } = nemNaiveRange(HOURS_MS);
		const query = {
			region: '_all',
			interval: '5m',
			date_start: dateStart,
			date_end: dateEnd,
			primary_grouping: 'network_region'
		};
		const [power, proportions] = await Promise.all([
			fetchNetwork({ ...query, metric: 'power' }),
			fetchNetwork({ ...query, metric: 'renewable_share' })
		]);
		return { regions: summariseLive(power, proportions) };
	} catch (err) {
		console.error('Error loading live system snapshot:', err);
		return { regions: {}, error: 'Error loading live system snapshot.' };
	}
}

const annualCache = createSwrCache({
	edgeCacheKey: 'https://cache.openelectricity.org.au/internal/system-snapshot-annual-v1',
	fetcher: fetchAnnual,
	// A new month makes the cached window stale at once, whatever its age.
	isFresh: (value, storedAt) =>
		value.period === lastTwelveMonths('+10:00').dateEnd && Date.now() - storedAt < ANNUAL_FRESH_MS,
	isCacheable: (value) => !value.error && hasRegions(value.regions, ANNUAL_REGIONS)
});

const liveCache = createSwrCache({
	edgeCacheKey: 'https://cache.openelectricity.org.au/internal/system-snapshot-live-v1',
	fetcher: fetchLive,
	isFresh: (_value, storedAt) => Date.now() - storedAt < LIVE_FRESH_MS,
	isCacheable: (value) => !value.error && hasRegions(value.regions, NEM_SNAPSHOT_REGIONS)
});

/**
 * Both snapshot modes, each from its own cache.
 * @param {App.Platform | undefined} platform
 * @returns {Promise<{ live: LiveSnapshot, annual: AnnualSnapshot }>}
 */
export async function loadSystemSnapshot(platform) {
	const [live, annual] = await Promise.all([liveCache.get(platform), annualCache.get(platform)]);
	return { live, annual };
}
