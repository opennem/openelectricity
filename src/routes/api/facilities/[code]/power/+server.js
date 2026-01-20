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

	if (!code) {
		return error(400, 'Missing facility code');
	}

	try {
		// Calculate date range for last 7 days (timezone naive format)
		const now = new Date();
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		// Format as timezone naive (YYYY-MM-DDTHH:mm:ss)
		const formatDate = (/** @type {Date} */ d) => d.toISOString().slice(0, 19);

		const { response } = await client.getFacilityData(networkId, code, ['power'], {
			interval: '5m',
			dateStart: formatDate(sevenDaysAgo),
			dateEnd: formatDate(now)
		});

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
