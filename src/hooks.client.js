import { captureError, startSentry } from '$lib/sentry/client.js';

/** Start Sentry (errors, session replay, feedback) once the page is idle. */
export function init() {
	startSentry();
}

/**
 * Report load and render errors SvelteKit catches itself; a missing page
 * (404) isn't a fault.
 * @type {import('@sveltejs/kit').HandleClientError}
 */
export function handleError({ error, status }) {
	if (status !== 404) captureError(error);
}
