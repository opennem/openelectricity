/**
 * Sentry configuration and helpers shared by the browser client
 * (`$lib/sentry/client.js`) and the feedback widget. Pure, so it can be
 * tested without the SDK.
 */

/**
 * The DSN Sentry reports to, or null when Sentry is off. Errors and session
 * replay need only this; feedback also needs its own switch
 * (`resolveFeedbackDsn`).
 * @param {Record<string, string | undefined>} env - `$env/dynamic/public`
 */
export function resolveSentryDsn(env) {
	return env.PUBLIC_SENTRY_DSN?.trim() || null;
}

/**
 * Whether JavaScript errors and session replay report: wherever Sentry is on,
 * except local development (`vite dev`), which would otherwise send every
 * error from work in progress and (at its full replay rate) trip the relay's
 * rate limit. Set `PUBLIC_SENTRY_DEV=true` to check them locally. The
 * feedback form is unaffected.
 * @param {Record<string, string | undefined>} env - `$env/dynamic/public`
 * @param {boolean} dev - `$app/environment`'s `dev`
 */
export function reportsErrors(env, dev) {
	return !!resolveSentryDsn(env) && (!dev || env.PUBLIC_SENTRY_DEV === 'true');
}

/**
 * Share of sessions recorded in full. Development records every session so
 * replay can be checked locally; elsewhere 1% keeps the replay quota and the
 * relay's request volume in hand. Sessions with an error are always kept
 * (`replaysOnErrorSampleRate`), whatever this rate.
 * @param {string} environment
 */
export function replaySessionSampleRate(environment) {
	return environment === 'development' ? 1 : 0.01;
}

/**
 * Errors that aren't faults in the site, dropped before they're sent
 * (Sentry's `ignoreErrors`, matched against the message).
 * @type {RegExp[]}
 */
export const IGNORED_ERRORS = [
	// A chunk that didn't load: a page still on the previous build asking for
	// one the deploy removed, or a dropped download. `reloadOnStaleBuild`
	// reloads the page.
	/Failed to fetch dynamically imported module/,
	/error loading dynamically imported module/,
	/Importing a module script failed/,
	/Importing module .* is not found/,
	/Unable to preload CSS/,
	// One navigation superseded by another, or a view transition the browser
	// skipped (tab hidden, viewport resized).
	/^(Error: )?navigation aborted$/,
	/Transition was aborted/,
	/View transition was skipped/,
	// The reader's connection dropped.
	/^(TypeError: )?(Failed to fetch|Load failed|NetworkError when attempting to fetch resource\.)( \(.*\))?$/,
	// Outlook's link scanner opening pages from emails.
	/Object Not Found Matching Id/
];

/**
 * What to report for a window `error` or `unhandledrejection` event caught
 * before the SDK starts, or null when there's nothing to report. An error
 * event without an Error object (a cross-origin "Script error.", a
 * ResizeObserver loop) reports its message, which `ignoreErrors` and
 * Sentry's own filters can match; its `null` error arrives as an
 * unfilterable "Error: null".
 * @param {Pick<ErrorEvent, 'error' | 'message'> | Pick<PromiseRejectionEvent, 'reason'>} event
 * @returns {unknown}
 */
export function errorFromEvent(event) {
	if ('reason' in event) return event.reason ?? null;
	return event.error ?? (event.message || null);
}
