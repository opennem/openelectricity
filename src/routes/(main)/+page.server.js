import { client } from '$lib/sanity';
import { getHomepageRenewablesCached } from '$lib/oe-api/renewables-cache.server';
import { processFlows, processPrices } from '$lib/flows/process-flows.js';

// Disable prerendering - homepage has dynamic real-time data
export const prerender = false;

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
export async function load({ fetch, platform }) {
	// Streamed (returned un-awaited) so the slow OE fetch behind it never gates
	// homepage TTFB — the hero shows a skeleton until hydration anyway. The
	// catch is mandatory: a rejecting streamed promise is an unhandled rejection.
	const renewablesInput = getHomepageRenewablesCached(platform).catch(() => ({
		data: { marketStats: [] },
		error: "Couldn't load renewables data"
	}));

	// Fetch all data sources in parallel for better performance
	// Note: region-power, region-energy, region-emissions are fetched client-side
	// because they make multiple external API calls that can timeout on Cloudflare
	const [homepageData, articles, flows, prices, tracker7dProcessed] = await Promise.all([
		client.fetch(
			`*[_type == "homepage"]{_id, banner_title, banner_statement, milestones_title, map_title, records_title, analysis_title, goals_title, goals}`
		),
		client.fetch(
			`*[_type == "article"]| order(publish_date desc)[0..10]{_id, title, content, slug, publish_date, cover, article_type, region, fueltech, summary, author[]->, tags[]->}`
		),
		fetch('/api/flows')
			.then(processFlows)
			.catch(() => ({ dispatchDateTimeString: '', regionFlows: {}, originalJsons: null })),
		fetch('/api/prices')
			.then(processPrices)
			.catch(() => ({ regionPrices: {}, originalJsons: null })),
		safeFetchJson(fetch, '/api/tracker/7d-processed?regionPath=au/NEM&interval=30m', null)
	]);

	return {
		homepageData,
		articles: /** @type {Article[]} */ (articles).filter((d) => d.article_type !== null),
		flows,
		prices,
		tracker7dProcessed,
		renewablesInput
	};
}
