import { createCmsClient } from '$lib/sanity-cms.js';
import { curatedCommunityExamples } from './example-catalogue.js';

/**
 * Fetch the currently published charts selected for the Stratify documentation.
 * @param {{ fetch: (query: string, params: Record<string, any>) => Promise<any[]> }} [client]
 */
export async function fetchCuratedCommunityCharts(client = createCmsClient()) {
	const ids = curatedCommunityExamples.map((example) => example.chartId);
	if (!ids.length) return [];
	return client.fetch(`*[_type == "stratifyChart" && _id in $ids && status == "published"]{...}`, {
		ids
	});
}

/**
 * Fetch one curated chart, provided it is still published.
 * @param {string} id
 * @param {{ fetch: (query: string, params: Record<string, any>) => Promise<Record<string, any> | null> }} [client]
 */
export async function fetchCuratedCommunityChart(id, client = createCmsClient()) {
	return client.fetch(`*[_type == "stratifyChart" && _id == $id && status == "published"][0]`, {
		id
	});
}
