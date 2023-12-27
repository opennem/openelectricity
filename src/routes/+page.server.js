import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';
import { format, isToday } from 'date-fns';
import { energyData } from '$lib/stats';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, fetch }) {
	const homepageData = await client.fetch(
		`*[_type == "homepage"]{_id, banner_title, banner_statement, map_title, chart_title, records_title, analysis_title, goals_title, goals}`
	);
	const articles = await client.fetch(`*[_type == "article"][0..3]{_id, title, content, slug}`);

	const recordsRes = await fetch('/api/records');
	let records = [];

	if (recordsRes && recordsRes.ok) {
		records = await recordsRes.json();
	}

	const { annual, live } = await energyData();

	if (homepageData && homepageData.length > 0) {
		return {
			...homepageData[0],
			articles,
			records,
			annual,
			live
		};
	}

	throw error(404, 'Not found');
}
