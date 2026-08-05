import { error } from '@sveltejs/kit';
import { fetchAllFacilities } from '$lib/server/opennem/fetch-facilities.js';
import { urlsetXml, xmlResponse } from '$lib/seo/sitemap.js';

/**
 * One entry per facility page (~600), every status — retired facilities have
 * pages too. 503 on upstream failure rather than serving an empty urlset: a
 * transient empty sitemap risks deindexing every facility page until the
 * next crawl.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ url }) {
	const facilities = await fetchAllFacilities();
	if (!facilities) throw error(503, 'Facilities unavailable');

	const codes = facilities
		.map((/** @type {any} */ f) => f?.code)
		.filter(Boolean)
		.sort();

	return xmlResponse(
		urlsetXml(
			codes.map((/** @type {string} */ code) => ({
				loc: `${url.origin}/facility/${encodeURIComponent(code)}`
			}))
		)
	);
}
