import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { createSwrCache } from '$lib/server/swr-cache';
import {
	derivePairwiseFlows,
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
 * Pairwise interconnector flows, derived from the OE v4 API.
 *
 * The legacy stats flows endpoint this route used to proxy has been
 * decommissioned, and v4 has no pairwise interconnector metric — so this
 * adapter fetches per-region `flow_imports`/`flow_exports` and derives the
 * four corridor flows exactly via the NEM's tree topology (see
 * `$lib/flows/derive-pairwise.js`). The response keeps the legacy payload
 * shape (`{ data: [{ code: 'NSW1->QLD1', history: { last, data } }] }`), so
 * the homepage system-snapshot and the tracker consume it unchanged. Positive
 * values flow in the key's direction.
 *
 * The upstream query is SWR-cached: the data is identical for every caller
 * and changes once per dispatch interval, and the homepage load's internal
 * fetch bypasses HTTP caching entirely — without this, every homepage TTFB
 * would pay a live OE round-trip.
 *
 * @returns {Promise<{ data: any[], error?: string }>}
 */
async function fetchFlowsPayload() {
	// Last hour (a full trailing row needs only a small lag buffer),
	// timezone-naive in NEM local time per the OE API convention.
	const { dateStart, dateEnd } = nemNaiveRange(HOURS_MS);

	try {
		const { response } = await client.getMarket('NEM', ['flow_imports', 'flow_exports'], {
			interval: '5m',
			primaryGrouping: 'network_region',
			dateStart,
			dateEnd
		});

		const derived = derivePairwiseFlows(response.data);
		const { timestamps, series } = trimToLastCompleteRow(derived.timestamps, derived.series);
		return toLegacyPayload(timestamps, series);
	} catch (err) {
		if (err instanceof NoDataFound) return { data: [] };
		console.error('Error deriving interconnector flows:', err);
		return { data: [], error: 'Error reading from flows API.' };
	}
}

const cache = createSwrCache({
	edgeCacheKey: 'https://cache.openelectricity.org.au/internal/interconnector-flows-v1',
	fetcher: fetchFlowsPayload,
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
