import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';

import { client } from '$lib/sanity';
import { energyData } from '$lib/stats';
import ispData from '$lib/isp';
import energyHistory from '$lib/energy_history';

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
	const { data: dataTrackerJson } = await dataTrackerRes.json();
	const dataTrackerData = dataTrackerJson.filter(
		(/** @type {StatsData} */ d) => d.fuel_tech && d.type === 'power'
	);

	const historyEnergyNemRes = await fetch(`${PUBLIC_JSON_API}/au/NEM/energy/all.json`);
	const { data: jsonData } = await historyEnergyNemRes.json();
	const historyEnergyNemData = energyHistory(jsonData);

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

			dataTrackerData,
			historyEnergyNemData
		};
	}

	throw error(404, 'Not found');
}
