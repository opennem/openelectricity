import { error } from '@sveltejs/kit';
import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

const DEFAULT_CATEGORIES = ['air_pollutant', 'water_pollutant', 'heavy_metal', 'organic'];

/**
 * Fetch a single category for a facility. The OE API mis-stamps the
 * `pollutant_category` column when multiple categories are requested in one
 * call (everything collapses to `air_pollutant` / `heavy_metal`), so we issue
 * one request per category and re-stamp the column ourselves based on the
 * request parameter — which is the only reliable source of truth.
 *
 * @param {string} code
 * @param {string} category
 */
async function fetchCategory(code, category) {
	try {
		const r = await client.getFacilityPollution({
			facility_code: [code],
			pollutant_category: /** @type {any} */ ([category])
		});
		const data = r.response.data ?? [];
		for (const ts of data) {
			for (const result of ts.results ?? []) {
				if (result.columns) result.columns.pollutant_category = category;
			}
		}
		return data;
	} catch (err) {
		if (err instanceof NoDataFound) return [];
		throw err;
	}
}

export async function GET({ params, url, setHeaders }) {
	const { code } = params;

	if (!code) {
		return error(400, 'Missing facility code');
	}

	const categoryParam = url.searchParams.get('pollutant_category');
	const categories = categoryParam ? categoryParam.split(',') : DEFAULT_CATEGORIES;

	try {
		const perCategory = await Promise.all(categories.map((cat) => fetchCategory(code, cat)));
		const data = perCategory.flat();

		setHeaders({
			'Cache-Control': 'public, max-age=2592000'
		});

		return Response.json({
			facility_code: code,
			response: { data }
		});
	} catch (err) {
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
