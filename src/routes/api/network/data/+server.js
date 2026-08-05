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
 *   region           — Explorer region value ('_all', 'nsw1'…, 'wem')
 *   metric           — 'power' | 'energy' | 'emissions' | 'emissions_intensity'
 *                      | one of the MARKET_METRIC_NAMES keys
 *   interval         — native OE interval ('5m', '1h', '1d', '1M', '3M', '1y')
 *   date_start       — timezone-naive local start (YYYY-MM-DDTHH:mm:ss)
 *   date_end         — timezone-naive local end
 *   primary_grouping — 'network_region' to split the metric per region in one
 *                      response (the tracker's pairwise-flow derivation and
 *                      the map-view mini charts); both branches
 *
 * `emissions_intensity` fans out to `['emissions', basis]` in one request —
 * the intensity ratio needs an energy denominator, which is `power` at
 * sub-daily grains (converted client-side via bucket hours) and `energy`
 * at daily-and-coarser.
 */

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
	return [/** @type {import('openelectricity').DataMetric} */ (metric)];
}
export async function GET({ url, setHeaders }) {
	const { searchParams } = url;
	const region = searchParams.get('region') || '_all';
	const metric = searchParams.get('metric') || 'power';
	const interval = searchParams.get('interval') || '5m';
	const dateStart = searchParams.get('date_start') || undefined;
	const dateEnd = searchParams.get('date_end') || undefined;
	const primaryGrouping = searchParams.get('primary_grouping') || undefined;

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
			if (primaryGrouping === 'network_region') options.primaryGrouping = 'network_region';
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
			if (primaryGrouping === 'network_region') options.primaryGrouping = 'network_region';
			({ response } = await client.getNetworkData(
				networkId,
				dataMetricsFor(metric, interval),
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
