import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
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

/**
 * Pairwise interconnector flows, derived from the OE v4 API.
 *
 * The legacy stats flows endpoint this route used to proxy has been
 * decommissioned, and v4 has no pairwise interconnector metric — so this
 * adapter fetches per-region `flow_imports`/`flow_exports` and derives the
 * four corridor flows exactly via the NEM's tree topology (see
 * `$lib/flows/derive-pairwise.js`). The response keeps the legacy payload
 * shape (`{ data: [{ code: 'NSW1->QLD1', history: { last, data } }] }`), so
 * the homepage system-snapshot and the tracker-map prototypes consume it
 * unchanged. Positive values flow in the key's direction.
 */
export async function GET({ setHeaders }) {
	// Last 3 hours, timezone-naive in NEM local time per the OE API convention.
	const { dateStart, dateEnd } = nemNaiveRange(3 * HOURS_MS);

	try {
		const { response } = await client.getMarket('NEM', ['flow_imports', 'flow_exports'], {
			interval: '5m',
			primaryGrouping: 'network_region',
			dateStart,
			dateEnd
		});

		const derived = derivePairwiseFlows(response.data);
		const { timestamps, series } = trimToLastCompleteRow(derived.timestamps, derived.series);

		setHeaders({ 'cache-control': 'public, max-age=300' });
		return Response.json(toLegacyPayload(timestamps, series));
	} catch (err) {
		if (err instanceof NoDataFound) {
			return Response.json({ data: [] });
		}
		console.error('Error deriving interconnector flows:', err);
		return Response.json({ error: 'Error reading from flows API.' }, { status: 500 });
	}
}
