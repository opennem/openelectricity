import { error } from '@sveltejs/kit';
import { getBuiltInExample, getCommunityExample } from '$lib/stratify/example-catalogue.js';
import { resolveDocumentationExample } from '$lib/stratify/example-docs.js';
import { fetchCuratedCommunityChart } from '$lib/stratify/community-examples.server.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, setHeaders }) {
	setHeaders({
		'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
	});

	if (getBuiltInExample(params.slug)) {
		return { example: resolveDocumentationExample(params.slug) };
	}

	const definition = getCommunityExample(params.slug);
	if (!definition) error(404, 'Example not found');
	const chart = await fetchCuratedCommunityChart(definition.chartId);
	if (!chart) error(404, 'This community example is no longer published');
	return { example: resolveDocumentationExample(params.slug, chart) };
}
