import { error } from '@sveltejs/kit';

import { client } from '$lib/sanity';
import { energyData } from '$lib/stats';
import ispData from '$lib/isp';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	const homepageData = await client.fetch(
		`*[_type == "homepage"]{_id, banner_title, banner_statement, milestones_title, map_title, chart_title, records_title, analysis_title, goals_title, goals}`
	);

	/** @return {Promise<import('$lib/types/article.types').Article[]>} */
	const articles = async () => {
		const res = await client.fetch(
			`*[_type == "article" && article_type != "milestone"]| order(publish_date desc)[0..10]{_id, title, content, slug, publish_date, cover, article_type, region, fueltech, summary, author[]->, tags[]->}`
		);
		return res;
	};

	/** @return {Promise<import('$lib/types/article.types').Article[]>} */
	const milestones = async () => {
		const res = await client.fetch(
			`*[_type == "article" && article_type == "milestone"]| order(publish_date desc)[0..10]{_id, title, content, slug, publish_date, cover, article_type, region, fueltech, summary, author[]->, tags[]->}`
		);
		return res;
	};

	/** @return {Promise<*>} */
	const energyDataRes = async () => {
		const res = await energyData();
		return res;
	};

	const { outlookEnergyNem, pathways, scenarios, fuelTechs } = ispData();

	if (homepageData && homepageData.length > 0) {
		return {
			...homepageData[0],
			articles: articles(),
			milestones: milestones(),
			mapAllData: energyDataRes(),
			// annual,
			// live,

			outlookEnergyNem,
			pathways,
			scenarios,
			fuelTechs
		};
	}

	throw error(404, 'Not found');
}
