import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
import { MARKET_METRIC_NAMES } from '$lib/components/charts/network/market-metric-names.js';
import { auUpstreamRanges, mergeAuResponses } from '$lib/server/network-data-au.js';

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
 *   region           — Explorer region value ('_all', 'nsw1'…, 'wem'), or 'au'
 *                      for NEM+WEM merged server-side (network-data-au.js;
 *                      metric=price stays NEM-only — no national spot price)
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
