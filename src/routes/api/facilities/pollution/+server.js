import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

const CATEGORIES = /** @type {const} */ ([
	'air_pollutant',
	'water_pollutant',
	'heavy_metal',
	'organic'
]);

/**
 * Batch fetch pollution data across every NPI-reporting facility, one SDK
 * call per category. The OE API's `pollutant_category` column gets
 * mis-stamped when multiple categories are batched into a single request
 * (see /api/facilities/[code]/pollution/+server.js for the original
 * workaround), so we fan out and re-stamp ourselves.
 *
 * Reduces to:
 *   { values: { [facility_code]: { air_pollutant: total, water_pollutant: ..., ... } } }
 *
 * Each `total` is the sum of all pollutants in that category for the facility's
 * latest reported year — gives a single magnitude to drive marker sizing.
 *
 * @param {string} category
 */
async function fetchCategory(category) {
	try {
		const r = await client.getFacilityPollution({
			pollutant_category: /** @type {any} */ ([category])
		});
		return r.response.data ?? [];
	} catch (err) {
		if (err instanceof NoDataFound) return [];
		throw err;
	}
}

export async function GET({ setHeaders }) {
	try {
		const perCategoryData = await Promise.all(CATEGORIES.map(fetchCategory));

		/** @type {Record<string, Record<string, number>>} */
		const values = {};

		for (let i = 0; i < CATEGORIES.length; i++) {
			const category = CATEGORIES[i];
			const seriesArr = perCategoryData[i] ?? [];

			// Per-facility, latest-year sum across pollutants in this category.
			/** @type {Map<string, { latestYear: string, total: number }>} */
			const byFacility = new Map();

			for (const ts of seriesArr) {
				for (const result of ts.results ?? []) {
					const code = result.name;
					if (!code) continue;

					// Find the most recent non-null year for this pollutant series.
					let latestYear = '';
					let latestValue = /** @type {number | null} */ (null);
					for (const [timestamp, value] of result.data ?? []) {
						if (value == null) continue;
						const year = String(timestamp).slice(0, 4);
						if (year > latestYear) {
							latestYear = year;
							latestValue = value;
						}
					}
					if (latestValue == null || !latestYear) continue;

					const existing = byFacility.get(code);
					if (!existing || latestYear > existing.latestYear) {
						byFacility.set(code, { latestYear, total: latestValue });
					} else if (latestYear === existing.latestYear) {
						existing.total += latestValue;
					}
				}
			}

			for (const [code, { total }] of byFacility) {
				if (!values[code]) values[code] = {};
				values[code][category] = total;
			}
		}

		setHeaders({
			'Cache-Control': 'public, max-age=2592000'
		});

		return Response.json({ values });
	} catch (err) {
		console.error('Error fetching batched pollution data:', err);
		return Response.json(
			{ error: /** @type {any} */ (err).message },
			{ status: 500 }
		);
	}
}
