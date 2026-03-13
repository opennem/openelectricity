import { error } from '@sveltejs/kit';
import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

const DEFAULT_CATEGORIES = ['air_pollutant', 'water_pollutant', 'heavy_metal', 'organic'];

export async function GET({ params, url, setHeaders }) {
	const { code } = params;

	if (!code) {
		return error(400, 'Missing facility code');
	}

	const categoryParam = url.searchParams.get('pollutant_category');
	const categories = categoryParam ? categoryParam.split(',') : DEFAULT_CATEGORIES;

	try {
		const r = await client.getFacilityPollution({
			facility_code: [code],
			pollutant_category: /** @type {any} */ (categories)
		});

		setHeaders({
			'Cache-Control': 'public, max-age=3600'
		});

		return Response.json({
			facility_code: code,
			response: { data: r.response.data ?? [] }
		});
	} catch (err) {
		if (err instanceof NoDataFound) {
			return Response.json({
				facility_code: code,
				response: { data: [] }
			});
		}

		console.error('Error fetching facility pollution data:', err);
		return Response.json(
			{
				error: /** @type {any} */ (err).message,
				details: /** @type {any} */ (err).details
			},
			{ status: 500 }
		);
	}
}
