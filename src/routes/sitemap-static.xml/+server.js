import { urlsetXml, xmlResponse } from '$lib/seo/sitemap.js';

// Hand-curated: the indexable top-level surfaces. App-like and utility routes
// (/studio, /records-checker, the (micro) embeds) are deliberately absent and
// disallowed in robots.txt. Individual records pages are also left out for
// now — thousands of thin, query-param-heavy pages would drown the rest.
const STATIC_PATHS = [
	'/',
	'/facilities',
	'/tracker',
	'/records',
	'/scenarios',
	'/analysis',
	'/strata-community',
	'/about',
	'/newsletter'
];

/** @param {{ url: URL }} event */
export function GET({ url }) {
	return xmlResponse(urlsetXml(STATIC_PATHS.map((path) => ({ loc: `${url.origin}${path}` }))));
}
