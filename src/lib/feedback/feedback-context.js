import { resolveSentryDsn } from '$lib/sentry/config.js';

/**
 * Pure helpers for the Sentry feedback form: whether it is configured and the
 * page context attached to each
 * submission. The browser-only controller lives in `./feedback.svelte.js`.
 */

/**
 * Query parameters worth keeping with feedback: the view, region, range and
 * filter state that reproduces what the reader was looking at on the Tracker
 * and Facilities pages. Everything else — free-text search (`q`), campaign
 * tags, anything unknown — is dropped before the page URL leaves the browser.
 */
export const FEEDBACK_PARAM_ALLOW_LIST = /** @type {const} */ ([
	'view',
	'region',
	'regions',
	'metric',
	'interval',
	'range',
	'preset',
	'filter',
	'date_start',
	'date_end',
	'group',
	'overlay',
	'transform',
	'contribution',
	'compare',
	'table',
	'columns',
	'hidden',
	'price',
	'statuses',
	'fuel_techs',
	'capacity_min',
	'capacity_max',
	'year_min',
	'year_max',
	'fullscreen'
]);

/**
 * @typedef {Object} FeedbackContext
 * @property {string} url - Origin, path and allow-listed parameters only
 * @property {string} path
 * @property {Record<string, string>} filters - Allow-listed parameters
 */

/**
 * The DSN to send feedback to, or null when feedback is off. Both a DSN and
 * the explicit switch are required, so a DSN added later for other Sentry
 * use doesn't switch the feedback form on by itself.
 * @param {Record<string, string | undefined>} env - Public environment variables
 * @returns {string | null}
 */
export function resolveFeedbackDsn(env) {
	const dsn = resolveSentryDsn(env);
	return env.PUBLIC_FEEDBACK_ENABLED === 'true' && dsn ? dsn : null;
}

/**
 * The page a reader is giving feedback on, read when the form opens so a
 * client-side navigation since the page loaded can't leave stale details.
 * @param {string} href
 * @returns {FeedbackContext}
 */
export function buildFeedbackContext(href) {
	const source = new URL(href);
	const url = new URL(source.pathname, source.origin);
	/** @type {Record<string, string>} */
	const filters = {};
	for (const key of FEEDBACK_PARAM_ALLOW_LIST) {
		const values = source.searchParams.getAll(key);
		if (values.length === 0) continue;
		filters[key] = values.join(',');
		for (const value of values) url.searchParams.append(key, value);
	}
	return { url: url.toString(), path: source.pathname, filters };
}

/**
 * Attach the page context to an outgoing feedback event. Replaces the full
 * `location.href` Sentry records with the allow-listed URL, and sets tags on
 * the event rather than the shared scope, so one submission's filters never
 * carry over to the next.
 * @param {{ contexts?: Record<string, any>, tags?: Record<string, any> }} event
 * @param {FeedbackContext | null} context
 */
export function applyFeedbackContext(event, context) {
	if (!context) return;
	event.contexts = {
		...event.contexts,
		feedback: { ...event.contexts?.feedback, url: context.url },
		page: { path: context.path, filters: context.filters }
	};
	event.tags = { ...event.tags, page: context.path };
}
