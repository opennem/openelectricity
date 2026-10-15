/**
 * Sentry configuration shared by the browser client
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
	// A page still on the previous build asks for chunks the deploy removed;
	// `reloadOnStaleBuild` moves it onto the new one.
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
