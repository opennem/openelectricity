import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';
import { client } from '$lib/sanity';
import { energyData } from '$lib/stats';
import ispData from '$lib/isp';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
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
	const { outlookEnergyNem, pathways, scenarios, fuelTechs } = ispData();

	const dataTrackerRes = await fetch(`${PUBLIC_JSON_API}/au/NEM/power/7d.json`);
	const { data } = await dataTrackerRes.json();
	const dataTrackerData = data.filter(
		(/** @type {import('$lib/types/stats.types').StatsData} */ d) =>
			d.fuel_tech && d.fuel_tech !== 'solar_rooftop'
	);

	if (homepageData && homepageData.length > 0) {
		return {
			...homepageData[0],
			articles,
			records,
			annual,
			live,

			outlookEnergyNem,
			pathways,
			scenarios,
			fuelTechs,

			dataTrackerData
		};
	}

	throw error(404, 'Not found');
}
