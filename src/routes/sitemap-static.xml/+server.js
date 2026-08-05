import { urlsetXml, xmlResponse } from '$lib/seo/sitemap.js';

// Hand-curated: the indexable top-level surfaces. App-like and utility routes
// (/studio, /records-checker, the (micro) embeds) are deliberately absent and
// disallowed in robots.txt. Individual records pages are also left out for
// now — thousands of thin, query-param-heavy pages would drown the rest.
// /tracker is absent while it's alpha (nav-gated behind the tracker_nav
// flag) — add it here when it launches.
const STATIC_PATHS = [
	'/',
	'/facilities',
	'/records',
	'/scenarios',
	'/analysis',
	'/strata-community',
	'/about',
	'/newsletter'
];

/** @type {import('./$types').RequestHandler} */
export function GET({ url }) {
	return xmlResponse(urlsetXml(STATIC_PATHS.map((path) => ({ loc: `${url.origin}${path}` }))));
}
