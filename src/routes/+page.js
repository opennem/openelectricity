import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const homepageData = await client.fetch(
		`*[_type == "homepage"]{_id, banner_title, banner_statement, map_title, chart_title, records_title, analysis_title, goals_title, goals}`
	);
	const articles = await client.fetch(`*[_type == "article"][0..3]{_id, title, content, slug}`);

	if (homepageData && homepageData.length > 0) {
		return {
			...homepageData[0],
			articles
		};
	}

	throw error(404, 'Not found');
}
