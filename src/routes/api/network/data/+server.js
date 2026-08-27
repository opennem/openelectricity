import { NoDataFound } from 'openelectricity';
import {
	HISTORICAL_FRESH_MS,
	cacheKeyFor,
	freshnessFor,
	makeUpstreamFetcher,
	networkDataCache,
	parseNetworkDataParams
} from '$lib/server/network-data.js';

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
 *   metric           — 'power' | 'energy' | 'market_value' | 'emissions' | 'emissions_intensity'
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
 *
 * Validation, canonical cache keys and the upstream fetch live in
 * `$lib/server/network-data.js`, shared with `/api/admin/network-cache/*`.
 */
export async function GET({ url, setHeaders, platform }) {
	const parsed = parseNetworkDataParams(url.searchParams);
	if ('error' in parsed) {
		return Response.json({ error: parsed.error }, { status: 400 });
	}
	const { params } = parsed;
	const { region, metric, interval, networkId } = params;

	try {
		const cacheKey = cacheKeyFor(params);
		const freshMs = freshnessFor(params.dateEnd);

		const { value, status } = await networkDataCache.get(
			platform,
			cacheKey,
			makeUpstreamFetcher(params),
			{ freshMs }
		);

		setHeaders({
			// This header controls browsers; the Cache API handles edge storage.
			'Cache-Control':
				freshMs === HISTORICAL_FRESH_MS
					? 'public, max-age=3600, stale-while-revalidate=3600'
					: 'public, max-age=300',
			'x-oe-cache': status
		});

		return Response.json(value);
	} catch (err) {
		if (err instanceof NoDataFound) {
			return Response.json({ region, network_id: networkId, response: { data: [] } });
		}
		const status = [400, 403, 429].includes(Number(/** @type {any} */ (err).statusCode))
			? Number(/** @type {any} */ (err).statusCode)
			: 500;
		console.error(
			JSON.stringify({
				message: 'Error fetching network data',
				region,
				metric,
				interval,
				error: /** @type {any} */ (err).message
			})
		);
		return Response.json(
			{
				error: /** @type {any} */ (err).message,
				details: /** @type {any} */ (err).details
			},
			{ status }
		);
	}
}
