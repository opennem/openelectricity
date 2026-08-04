import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';
import { toLastmod, urlsetXml, xmlResponse } from '$lib/seo/sitemap.js';

/**
 * Editorial pages from Sanity: /analysis/<slug> articles and
 * /analysis/tags/<slug> listings. `_updatedAt` is a trustworthy lastmod here —
 * it moves only on publish.
 *
 * The article filter mirrors the /analysis listing (analysis/+page.server.js):
 * `article_type == null` marks unlisted articles, which shouldn't be submitted
 * for indexing either. Sanity `content` documents are deliberately absent —
 * /content/* is excluded from the Cloudflare worker and not prerendered, so
 * those URLs currently 404 in production.
 * @param {{ url: URL }} event
 */
export async function GET({ url }) {
	/** @type {Array<{ slug: string, _updatedAt?: string }>} */
	let articles;
	/** @type {Array<{ slug: string, _updatedAt?: string }>} */
	let tags;
	try {
		[articles, tags] = await Promise.all([
			client.fetch(
				`*[_type == "article" && defined(slug.current) && defined(article_type)]{ "slug": slug.current, _updatedAt }`
			),
			client.fetch(`*[_type == "tag" && defined(slug.current)]{ "slug": slug.current, _updatedAt }`)
		]);
	} catch {
		throw error(503, 'CMS unavailable');
	}

	/**
	 * @param {Array<{ slug: string, _updatedAt?: string }>} docs
	 * @param {string} prefix
	 */
	const entries = (docs, prefix) =>
		docs.map((d) => ({
			loc: `${url.origin}${prefix}/${encodeURIComponent(d.slug)}`,
			lastmod: toLastmod(d._updatedAt)
		}));

	return xmlResponse(
		urlsetXml([...entries(articles, '/analysis'), ...entries(tags, '/analysis/tags')])
	);
}
