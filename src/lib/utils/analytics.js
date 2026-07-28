import { browser } from '$app/environment';

/**
 * Track a named Fathom event. `window.fathom` may be absent (the deferred CDN
 * script in app.html not yet loaded, or ad-blocked), so calls are safely
 * fire-and-forget. Pageviews are already handled by the snippet's
 * `data-spa="auto"`.
 * @param {string} name event name as it appears in the Fathom dashboard
 */
export function trackEvent(name) {
	if (!browser) return;
	window.fathom?.trackEvent(name);
}
