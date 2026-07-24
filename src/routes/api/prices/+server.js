import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
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

/**
 * Regional spot prices, served from the OE v4 API.
 *
 * The legacy stats price endpoint this route used to proxy returns
 * 410 Gone ("Endpoint removed — use v4 API"), so this adapter fetches the v4
 * `price` metric grouped by network region and emits the legacy payload shape
 * (`{ data: [{ code: 'NSW1', history: { last, data } }] }`) that the homepage
 * system-snapshot and the tracker-map prototypes already consume.
 */
export async function GET({ setHeaders }) {
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

		setHeaders({ 'cache-control': 'public, max-age=300' });
		return Response.json(toLegacyPayload(timestamps, series));
	} catch (err) {
		if (err instanceof NoDataFound) {
			return Response.json({ data: [] });
		}
		console.error('Error fetching regional prices:', err);
		return Response.json({ error: 'Error reading from price API.' }, { status: 500 });
	}
}
