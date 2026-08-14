import { fetchCuratedCommunityCharts } from '$lib/stratify/community-examples.server.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ setHeaders }) {
	setHeaders({
		'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
	});

	return { communityCharts: await fetchCuratedCommunityCharts() };
}
