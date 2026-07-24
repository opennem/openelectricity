import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
import { MARKET_METRIC_NAMES } from '$lib/components/charts/network/market-metric-names.js';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

/**
 * Network-level time-series for the Explorer dashboard.
 *
 * One endpoint backs every Explorer panel. Generation (`metric=power|energy`)
 * comes from `getNetworkData` grouped per fuel tech; market metrics (price,
 * demand, curtailment, flows — see `MARKET_METRIC_NAMES`) from `getMarket`.
 * Curtailment fans out to the solar/wind splits so charts can stack by source;
 * flows returns both directions (imports/exports) for the selected region, and
 * the `_energy` variants let panels ladder power↔energy with the interval. The
 * response is returned under `{ response }` so the client-side
 * `ChartDataManager` (which reads `json.response`) can drive it through the same
 * pan/zoom/cache pipeline as the facility charts.
 *
 * Query params (built by `ChartDataManager` + the NetworkChart fetch-url closure):
 *   region      — Explorer region value ('_all', 'nsw1'…, 'wem')
 *   metric      — 'power' | 'energy' | one of the MARKET_METRIC_NAMES keys
 *   interval    — native OE interval ('5m', '1h', '1d', '1M', '3M', '1y')
 *   date_start  — timezone-naive local start (YYYY-MM-DDTHH:mm:ss)
 *   date_end    — timezone-naive local end
 */
export async function GET({ url, setHeaders }) {
	const { searchParams } = url;
	const region = searchParams.get('region') || '_all';
	const metric = searchParams.get('metric') || 'power';
	const interval = searchParams.get('interval') || '5m';
	const dateStart = searchParams.get('date_start') || undefined;
	const dateEnd = searchParams.get('date_end') || undefined;

	const { networkId, networkRegion } = regionToNetwork(region);

	try {
		let response;

		const marketMetrics = MARKET_METRIC_NAMES[metric];

		if (marketMetrics) {
			/** @type {import('openelectricity').IMarketTimeSeriesParams} */
			const options = {
				interval: /** @type {any} */ (interval),
				dateStart,
				dateEnd,
				network_region: networkRegion
			};
			({ response } = await client.getMarket(networkId, marketMetrics, options));
		} else {
			/** @type {import('openelectricity').INetworkTimeSeriesParams} */
			const options = {
				interval: /** @type {any} */ (interval),
				dateStart,
				dateEnd,
				network_region: networkRegion,
				secondaryGrouping: ['fueltech']
			};
			({ response } = await client.getNetworkData(
				networkId,
				[/** @type {import('openelectricity').DataMetric} */ (metric)],
				options
			));
		}

		setHeaders({ 'Cache-Control': 'public, max-age=300' });

		return Response.json({ region, network_id: networkId, response });
	} catch (err) {
		if (err instanceof NoDataFound) {
			return Response.json({ region, network_id: networkId, response: { data: [] } });
		}
		console.error('Error fetching network data:', err);
		return Response.json(
			{
				error: /** @type {any} */ (err).message,
				details: /** @type {any} */ (err).details
			},
			{ status: 500 }
		);
	}
}
