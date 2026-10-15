import { captureError, startSentry } from '$lib/sentry/client.js';
import { registerServiceWorker } from '$lib/utils/service-worker.js';
import { reloadOnStaleBuild } from '$lib/utils/stale-build.js';

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
 * Report load and render errors SvelteKit catches itself; a missing page
 * (404) isn't a fault.
 * @type {import('@sveltejs/kit').HandleClientError}
 */
export function handleError({ error, status }) {
	if (status !== 404) captureError(error);
}
