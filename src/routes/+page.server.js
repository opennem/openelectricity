import { client } from '$lib/sanity';
import { energyData } from '$lib/stats';
// import ispData from '$lib/isp';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	const homepageData = await client.fetch(
		`*[_type == "homepage"]{_id, banner_title, banner_statement, milestones_title, map_title, records_title, analysis_title, goals_title, goals}`
	);

	/** @type {Article[]} */
	const articles = await client.fetch(
		`*[_type == "article"]| order(publish_date desc)[0..10]{_id, title, content, slug, publish_date, cover, article_type, region, fueltech, summary, author[]->, tags[]->}`
	);

	const energyDataRes = await energyData();

	// const { outlookEnergyNem, pathways, scenarios, fuelTechs } = ispData();

	return {
		homepageData,
		articles,
		mapAllData: energyDataRes

		// outlookEnergyNem,
		// pathways,
		// scenarios,
		// fuelTechs
	};
}
