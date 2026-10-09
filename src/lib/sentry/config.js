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
