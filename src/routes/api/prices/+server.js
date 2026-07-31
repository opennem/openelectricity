import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { createSwrCache } from '$lib/server/swr-cache';
import {
	collectRegionSeriesAligned,
	toLegacyPayload,
	trimToLastCompleteRow
} from '$lib/flows/derive-pairwise.js';
import { HOURS_MS, nemNaiveRange } from '$lib/flows/nem-time.js';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

/** One dispatch-ish interval — matches the route's public max-age. */
const FRESH_MS = 5 * 60 * 1000;

/**
 * Regional spot prices, served from the OE v4 API.
 *
 * The legacy stats price endpoint this route used to proxy returns
 * 410 Gone ("Endpoint removed — use v4 API"), so this adapter fetches the v4
 * `price` metric grouped by network region and emits the legacy payload shape
 * (`{ data: [{ code: 'NSW1', history: { last, data } }] }`) that the homepage
 * system-snapshot and the tracker already consume.
 *
 * SWR-cached for the same reason as `/api/flows`: shared data, one dispatch
 * interval of freshness, and internal load fetches bypass HTTP caching.
 *
 * @returns {Promise<{ data: any[], error?: string }>}
 */
async function fetchPricesPayload() {
	// Last hour, timezone-naive in NEM local time per the OE API convention.
	const { dateStart, dateEnd } = nemNaiveRange(HOURS_MS);

	try {
		const { response } = await client.getMarket('NEM', ['price'], {
			interval: '5m',
			primaryGrouping: 'network_region',
			dateStart,
			dateEnd
		});

		const collected = collectRegionSeriesAligned(response.data, 'price');
		const { timestamps, series } = trimToLastCompleteRow(collected.timestamps, collected.series);
		return toLegacyPayload(timestamps, series);
	} catch (err) {
		if (err instanceof NoDataFound) return { data: [] };
		console.error('Error fetching regional prices:', err);
		return { data: [], error: 'Error reading from price API.' };
	}
}

const cache = createSwrCache({
	edgeCacheKey: 'https://cache.openelectricity.org.au/internal/regional-prices-v1',
	fetcher: fetchPricesPayload,
	isFresh: (_payload, storedAt) => Date.now() - storedAt < FRESH_MS,
	// Never cache error envelopes or empty windows — a transient failure must
	// not serve stale-nothing for the next five minutes.
	isCacheable: (payload) => !payload.error && payload.data.length > 0
});

export async function GET({ setHeaders, platform }) {
	const payload = await cache.get(platform);
	if (payload.error) return Response.json({ error: payload.error }, { status: 500 });
	setHeaders({ 'cache-control': 'public, max-age=300' });
	return Response.json(payload);
}
