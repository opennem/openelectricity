import { browser, version } from '$app/environment';
import { env } from '$env/dynamic/public';
import { hostEnvironment } from '$lib/utils/environment.js';
import { replaySessionSampleRate, resolveSentryDsn } from './config.js';

/**
 * The browser's one Sentry client: JavaScript errors, session replay and the
 * feedback form (which registers its own integration on first open).
 *
 * The SDK is a separate chunk loaded once the page is idle, so it never
 * delays the first render; opening feedback loads it at once. Errors raised
 * before then are queued and sent when it starts. Off unless
 * `PUBLIC_SENTRY_DSN` is set.
 *
 * Replay records a sampled share of sessions (`replaySessionSampleRate`) and
 * keeps the minute before any error. OE's text, numbers and charts are public
 * data, so they are recorded as shown; what readers type is masked
 * (`maskAllInputs`), as is anything marked `data-sentry-mask` (the admin-only
 * Stratify app and signed-in emails).
 * Everything goes through the same-origin relay (`routes/api/feedback`), so
 * ad blockers don't drop it.
 */

/** @typedef {typeof import('./sdk.js')} SentrySdk */

/** @type {Promise<SentrySdk | null> | null} */
let loading = null;
/** Errors caught before the SDK started, sent once it has. */
/** @type {unknown[]} */
const earlyErrors = [];
const MAX_EARLY_ERRORS = 10;

/**
 * Load and start Sentry once. Resolves to the SDK, or null when Sentry is
 * off or failed to load (a later call retries).
 * @returns {Promise<SentrySdk | null>}
 */
export function loadSentry() {
	const dsn = browser ? resolveSentryDsn(env) : null;
	if (!dsn) return Promise.resolve(null);
	loading ??= import('./sdk.js')
		.then((Sentry) => {
			const environment = hostEnvironment(window.location.hostname);
			Sentry.init({
				dsn,
				// Same-origin relay: ad blockers stop requests to *.ingest.sentry.io.
				tunnel: '/api/feedback',
				// Binary envelopes (screenshots, replays) go out untyped, and SvelteKit's
				// Node adapter (vite dev and preview; not Cloudflare) drops untyped
				// bodies before any handler runs, so label every envelope.
				transportOptions: { headers: { 'Content-Type': 'application/x-sentry-envelope' } },
				release: `openelectricity@${version}`,
				environment,
				integrations: [
					Sentry.replayIntegration({
						maskAllText: false,
						blockAllMedia: false,
						maskAllInputs: true
					})
				],
				replaysSessionSampleRate: replaySessionSampleRate(environment),
				replaysOnErrorSampleRate: 1,
				// Collect nothing about the reader beyond what they type.
				dataCollection: {
					userInfo: false,
					cookies: false,
					httpHeaders: false,
					httpBodies: [],
					urlQueryParams: false
				},
				sendClientReports: false
			});
			for (const error of earlyErrors.splice(0)) Sentry.captureException(error);
			return Sentry;
		})
		.catch((err) => {
			console.error('Could not start Sentry:', err);
			loading = null;
			return null;
		});
	return loading;
}

/**
 * Start Sentry when the browser is next idle (or within a few seconds).
 * Uncaught errors before then are queued; the SDK's own handlers take over
 * once it starts.
 */
export function startSentry() {
	if (!browser || !resolveSentryDsn(env)) return;
	/** @param {ErrorEvent | PromiseRejectionEvent} event */
	const queue = (event) => captureError('reason' in event ? event.reason : event.error);
	window.addEventListener('error', queue);
	window.addEventListener('unhandledrejection', queue);
	const start = () =>
		void loadSentry().finally(() => {
			window.removeEventListener('error', queue);
			window.removeEventListener('unhandledrejection', queue);
		});
	if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 4000 });
	else setTimeout(start, 2000);
}

/**
 * Report an error SvelteKit caught (load and render failures it doesn't
 * rethrow), queueing it if the SDK hasn't started yet.
 * @param {unknown} error
 */
export function captureError(error) {
	if (!browser || !resolveSentryDsn(env)) return;
	if (loading) {
		void loading.then((Sentry) => Sentry?.captureException(error));
	} else if (earlyErrors.length < MAX_EARLY_ERRORS) {
		earlyErrors.push(error);
	}
}
