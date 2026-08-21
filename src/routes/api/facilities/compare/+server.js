import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { apiRangeLimitError } from '$lib/oe-api/data-limits.js';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

const VALID_INTERVALS = new Set(['5m', '1h', '1d', '7d', '1M', '3M', '1y']);
const VALID_METRICS = new Set(['power', 'energy']);
const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?$/;
const FACILITY_CODE = /^[A-Za-z0-9_-]{1,40}$/;

/** @param {URLSearchParams} searchParams */
export function _parseFacilityComparisonQuery(searchParams) {
	const networkId = searchParams.get('network_id');
	const facilityCodes = [...new Set(searchParams.getAll('facility_code'))];
	const metric = searchParams.get('metric') || 'power';
	const interval = searchParams.get('interval') || '5m';
	const dateStart = searchParams.get('date_start') || undefined;
	const dateEnd = searchParams.get('date_end') || undefined;

	if (networkId !== 'NEM' && networkId !== 'WEM') return { error: 'Invalid network.' };
	if (facilityCodes.length < 2 || facilityCodes.length > 6) {
		return { error: 'Choose between two and six facilities.' };
	}
	if (facilityCodes.some((code) => !FACILITY_CODE.test(code))) {
		return { error: 'Invalid facility code.' };
	}
	if (!VALID_METRICS.has(metric)) return { error: `Invalid metric: ${metric}` };
	if (!VALID_INTERVALS.has(interval)) return { error: `Invalid interval: ${interval}` };
	if (
		(dateStart && !LOCAL_DATE_TIME.test(dateStart)) ||
		(dateEnd && !LOCAL_DATE_TIME.test(dateEnd)) ||
		(dateStart && dateEnd && dateStart >= dateEnd)
	) {
		return { error: 'Invalid date range.' };
	}
	if (interval === '5m' && metric === 'energy') {
		return { error: 'Energy is not available at the 5-minute interval.' };
	}
	const rangeError = apiRangeLimitError(interval, dateStart, dateEnd);
	if (rangeError) return { error: rangeError };

	return { networkId, facilityCodes, metric, interval, dateStart, dateEnd };
}

export async function GET({ url, setHeaders }) {
	const query = _parseFacilityComparisonQuery(url.searchParams);
	if ('error' in query) return Response.json({ error: query.error }, { status: 400 });

	try {
		const { response } = await client.getFacilityData(
			/** @type {import('openelectricity').NetworkCode} */ (query.networkId),
			query.facilityCodes,
			[/** @type {'power'|'energy'} */ (query.metric)],
			{
				interval: /** @type {any} */ (query.interval),
				dateStart: query.dateStart,
				dateEnd: query.dateEnd
			}
		);

		setHeaders({ 'Cache-Control': 'public, max-age=300' });
		return Response.json({
			network_id: query.networkId,
			facility_codes: query.facilityCodes,
			response
		});
	} catch (err) {
		if (err instanceof NoDataFound) {
			return Response.json({
				network_id: query.networkId,
				facility_codes: query.facilityCodes,
				response: { data: [] }
			});
		}

		const status = [400, 403, 429].includes(Number(/** @type {any} */ (err).statusCode))
			? Number(/** @type {any} */ (err).statusCode)
			: 500;
		console.error(
			JSON.stringify({
				message: 'Error fetching facility comparison data',
				networkId: query.networkId,
				facilityCount: query.facilityCodes.length,
				metric: query.metric,
				interval: query.interval,
				error: /** @type {any} */ (err).message
			})
		);
		return Response.json(
			{ error: /** @type {any} */ (err).message, details: /** @type {any} */ (err).details },
			{ status }
		);
	}
}
