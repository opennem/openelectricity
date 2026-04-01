import { error } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { normaliseChart } from '$lib/stratify/chart-data.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const client = createCmsClient();

	const chart = await client.fetch(
		`*[_type == "stratifyChart" && _id == $id && status == "published"][0]`,
		{ id: params.id }
	);

	if (!chart) {
		error(404, 'Chart not found');
	}

	return {
		chart: {
			...normaliseChart(chart),
			publishedAt: chart.publishedAt
		}
	};
}
