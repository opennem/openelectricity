import { client } from '$lib/sanity';
import { PUBLIC_RECORDS_API, PUBLIC_API_KEY } from '$env/static/public';
import { fetchPinnedRecords } from '$lib/records/pinned-records.js';

/**
 * Process flows API response
 * @param {Response} res
 */
async function processFlows(res) {
	const { data: jsonData } = await res.json();

	/** @type {*} */
	const regionFlows = {};
	if (jsonData) {
		jsonData.forEach((/** @type {*} */ region) => {
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
}

/**
 * Process prices API response
 * @param {Response} res
 */
async function processPrices(res) {
	const { data: jsonData } = await res.json();
	/** @type {*} */
	const regionPrices = {};

	if (jsonData) {
		jsonData.forEach((/** @type {*} */ region) => {
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
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	// Fetch all data sources in parallel for better performance
	const [
		homepageData,
		articles,
		flows,
		prices,
		pinnedRecords,
		regionPower,
		regionEnergy,
		regionEmissions,
		tracker7dProcessed
	] = await Promise.all([
		client.fetch(
			`*[_type == "homepage"]{_id, banner_title, banner_statement, milestones_title, map_title, records_title, analysis_title, goals_title, goals}`
		),
		client.fetch(
			`*[_type == "article"]| order(publish_date desc)[0..10]{_id, title, content, slug, publish_date, cover, article_type, region, fueltech, summary, author[]->, tags[]->}`
		),
		fetch('/api/flows').then(processFlows),
		fetch('/api/prices').then(processPrices),
		fetchPinnedRecords(fetch, PUBLIC_RECORDS_API, PUBLIC_API_KEY),
		fetch('/api/region-power').then((r) => r.json()),
		fetch('/api/region-energy').then((r) => r.json()),
		fetch('/api/region-emissions').then((r) => r.json()),
		fetch('/api/tracker/7d-processed?regionPath=au/NEM&interval=30m').then((r) => r.json())
	]);

	return {
		homepageData,
		articles: /** @type {Article[]} */ (articles).filter((d) => d.article_type !== null),
		flows,
		prices,
		pinnedRecords,
		regionPower,
		regionEnergy,
		regionEmissions,
		tracker7dProcessed
	};
}
