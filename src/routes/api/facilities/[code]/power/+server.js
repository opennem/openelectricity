import { error } from '@sveltejs/kit';
import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function GET({ params, url, setHeaders }) {
	const { code } = params;
	const networkId = /** @type {import('openelectricity').NetworkCode} */ (
		url.searchParams.get('network_id') || 'NEM'
	);

	// Optional date range query params (format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
	const dateStartParam = url.searchParams.get('date_start');
	const dateEndParam = url.searchParams.get('date_end');
	const daysParam = url.searchParams.get('days');

	if (!code) {
		return error(400, 'Missing facility code');
	}

	try {
		// Format as timezone naive (YYYY-MM-DDTHH:mm:ss)
		const formatDate = (/** @type {Date} */ d) => d.toISOString().slice(0, 19);

		// Calculate date range - default to last 3 days
		const now = new Date();
		const days = daysParam ? parseInt(daysParam, 10) : 3;
		const defaultStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

		const dateStart = dateStartParam || formatDate(defaultStart);
		const dateEnd = dateEndParam || undefined; // Let API default to current time

		/** @type {import('openelectricity').GetFacilityDataOptions} */
		const options = {
			interval: '5m',
			dateStart
		};

		if (dateEnd) {
			options.dateEnd = dateEnd;
		}

		const { response } = await client.getFacilityData(networkId, code, ['power'], options);

		// Set cache headers (5 minutes)
		setHeaders({
			'Cache-Control': 'public, max-age=300'
		});

		return Response.json({
			facility_code: code,
			network_id: networkId,
			response
		});
	} catch (err) {
		console.error('Error fetching facility power data:', err);
		return Response.json(
			{
				error: /** @type {any} */ (err).message,
				details: /** @type {any} */ (err).details
			},
			{ status: 500 }
		);
	}
}
