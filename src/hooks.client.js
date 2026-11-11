import { captureError, startSentry } from '#lib/sentry/client.js';
import { registerServiceWorker } from '#lib/utils/service-worker.js';
import { reloadOnStaleBuild } from '#lib/utils/stale-build.js';

/**
 * Start Sentry (errors, session replay, feedback) once the page is idle,
 * install the service worker on top-level pages and recover tabs left on a
 * previous build.
 */
export function init() {
	startSentry();
	registerServiceWorker();
	reloadOnStaleBuild();
}

/**
 * Report load and render errors SvelteKit catches itself. Only `unknown`
 * errors are faults: `app` errors are ones we raised with `error(...)`, and
 * `framework` errors are SvelteKit's own (e.g. a 404 for a missing page).
 * @type {import('@sveltejs/kit/hooks').HandleClientError}
 */
export function handleError({ kind, error }) {
	if (kind === 'unknown') captureError(error);
}
