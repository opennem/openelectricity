import { createCmsClient } from '$lib/sanity-cms.js';
import { normaliseChart } from '$lib/stratify/chart-data.js';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	const client = createCmsClient();

	const charts = await client.fetch(
		`*[_type == "stratifyChart" && status == "published"] | order(publishedAt desc)[0...10]{
			...,
			"userEmail": userEmail
		}`
	);

	return {
		charts: charts.map((/** @type {Record<string, any>} */ chart) => ({
			...normaliseChart(chart),
			publishedAt: chart.publishedAt,
			userEmail: chart.userEmail
		}))
	};
}
