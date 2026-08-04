import { sitemapIndexXml, xmlResponse } from '$lib/seo/sitemap.js';

/**
 * Index pointing at the child sitemaps (referenced from static/robots.txt).
 * @param {{ url: URL }} event
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
