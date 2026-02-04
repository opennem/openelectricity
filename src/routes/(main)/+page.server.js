import { client } from '$lib/sanity';
import energyParser from '$lib/opennem/parser.js';

// Disable prerendering - homepage has dynamic real-time data
export const prerender = false;

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

/**
 * Safely fetch JSON with error handling
 * @param {typeof fetch} fetchFn
 * @param {string} url
 * @param {*} fallback
 */
async function safeFetchJson(fetchFn, url, fallback = null) {
	try {
		const res = await fetchFn(url);
		if (!res.ok) {
			console.error(`API error for ${url}: ${res.status}`);
			return fallback;
		}
		return await res.json();
	} catch (e) {
		console.error(`Fetch error for ${url}:`, e);
		return fallback;
	}
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	// Fetch all data sources in parallel for better performance
	// Note: region-power, region-energy, region-emissions are fetched client-side
	// because they make multiple external API calls that can timeout on Cloudflare
	const [
		homepageData,
		articles,
		flows,
		prices,
		tracker7dProcessed,
		energyData
	] = await Promise.all([
		client.fetch(
			`*[_type == "homepage"]{_id, banner_title, banner_statement, milestones_title, map_title, records_title, analysis_title, goals_title, goals}`
		),
		client.fetch(
			`*[_type == "article"]| order(publish_date desc)[0..10]{_id, title, content, slug, publish_date, cover, article_type, region, fueltech, summary, author[]->, tags[]->}`
		),
		fetch('/api/flows').then(processFlows).catch(() => ({ dispatchDateTimeString: '', regionFlows: {}, originalJsons: null })),
		fetch('/api/prices').then(processPrices).catch(() => ({ regionPrices: {}, originalJsons: null })),
		safeFetchJson(fetch, '/api/tracker/7d-processed?regionPath=au/NEM&interval=30m', null),
		safeFetchJson(fetch, '/api/energy', null)
	]);

	// Parse energy data safely
	const historyEnergyNemData = energyData?.data ? energyParser(energyData.data) : [];

	return {
		homepageData,
		articles: /** @type {Article[]} */ (articles).filter((d) => d.article_type !== null),
		flows,
		prices,
		tracker7dProcessed,
		historyEnergyNemData
	};
}
