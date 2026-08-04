/**
 * XML sitemap builders (sitemaps.org protocol) for the /sitemap*.xml routes.
 * Kept free of route imports so helpers are unit-testable. Routes pass their
 * request's `url.origin` — hardcoding the prod domain would emit cross-host
 * (invalid) entries on dev/preview deployments.
 */

import { escapeXml } from './xml.js';

/**
 * `<urlset>` document for a list of pages.
 * @param {Array<{ loc: string, lastmod?: string | null }>} entries
 * @returns {string}
 */
export function urlsetXml(entries) {
	const urls = entries
		.map(({ loc, lastmod }) => {
			const lastmodTag = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : '';
			return `<url><loc>${escapeXml(loc)}</loc>${lastmodTag}</url>`;
		})
		.join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

/**
 * `<sitemapindex>` document pointing at the child sitemaps.
 * @param {string[]} locs
 * @returns {string}
 */
export function sitemapIndexXml(locs) {
	const sitemaps = locs.map((loc) => `<sitemap><loc>${escapeXml(loc)}</loc></sitemap>`).join('\n');
	return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps}\n</sitemapindex>`;
}

/**
 * XML response with edge caching, matching the facility pages' 1h policy.
 * @param {string} body
 * @returns {Response}
 */
export function xmlResponse(body) {
	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
}

/**
 * `_updatedAt`-style timestamp → sitemap lastmod date (YYYY-MM-DD), or null
 * when unparseable.
 * @param {string | null | undefined} timestamp
 * @returns {string | null}
 */
export function toLastmod(timestamp) {
	if (!timestamp) return null;
	const match = String(timestamp).match(/^\d{4}-\d{2}-\d{2}/);
	return match ? match[0] : null;
}
