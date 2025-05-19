import { client } from '$lib/sanity';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const homepageData = await client.fetch(
		`*[_type == "homepage"]{_id, banner_title, banner_statement, milestones_title, map_title, records_title, analysis_title, goals_title, goals}`
	);

	/** @type {Article[]} */
	const articles = await client.fetch(
		`*[_type == "article"]| order(publish_date desc)[0..10]{_id, title, content, slug, publish_date, cover, article_type, region, fueltech, summary, author[]->, tags[]->}`
	);

	const flows = await fetch('/api/flows').then(async (res) => {
		const { data: jsonData } = await res.json();

		/** @type {*} */
		const regionFlows = {};
		if (jsonData) {
			jsonData.forEach((region) => {
				regionFlows[region.code] = region.history.data[region.history.data.length - 1];
			});

			return {
				dispatchDateTimeString: jsonData[0].history.last,
				regionFlows,
				originalJsons: jsonData
			};
		}

		return {
			dispatchDateTimeString: '',
			regionFlows,
			originalJsons: null
		};
	});

	const prices = await fetch('/api/prices').then(async (res) => {
		const { data: jsonData } = await res.json();
		/** @type {*} */
		const regionPrices = {};

		if (jsonData) {
			jsonData.forEach((region) => {
				regionPrices[region.code] = region.history.data[region.history.data.length - 1];
			});
			return {
				regionPrices,
				originalJsons: jsonData
			};
		}

		return {
			regionPrices,
			originalJsons: null
		};
	});

	return {
		homepageData,
		articles: articles.filter((d) => d.article_type !== null),
		flows,
		prices
	};
}
