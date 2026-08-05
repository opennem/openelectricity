import { sitemapIndexXml, xmlResponse } from '$lib/seo/sitemap.js';

/**
 * Index pointing at the child sitemaps (referenced from static/robots.txt).
 * @type {import('./$types').RequestHandler}
 */
export function GET({ url }) {
	return xmlResponse(
		sitemapIndexXml([
			`${url.origin}/sitemap-static.xml`,
			`${url.origin}/sitemap-facilities.xml`,
			`${url.origin}/sitemap-articles.xml`
		])
	);
}
