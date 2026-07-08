import { goto } from '$app/navigation';

/**
 * Fullscreen-mode URL convention for /facilities and /facility/[code]:
 * fullscreen is the DEFAULT, so it is never serialised — only the windowed
 * opt-out (`?fullscreen=false`) appears in URLs. The root (main) layout reads
 * the param and hides the global Nav/Footer chrome unless it is 'false'.
 * (Scenarios/studio use the inverse opt-in `?fullscreen=true` convention —
 * they default to windowed, so these helpers don't apply there.)
 */

/**
 * Whether a URL resolves to fullscreen mode — no param means fullscreen;
 * only an explicit `fullscreen=false` is windowed.
 * @param {URL} url
 * @returns {boolean}
 */
export function isFullscreenUrl(url) {
	return url.searchParams.get('fullscreen') !== 'false';
}

/**
 * Carry windowed mode onto an href (with the correct `?`/`&` join either
 * way). Fullscreen is the default, so the href is returned untouched unless
 * `windowed` is true.
 * @param {string} href - root-relative href, e.g. `/facilities?view=list`
 * @param {boolean} windowed
 * @returns {string}
 */
export function windowedHref(href, windowed) {
	if (!windowed) return href;
	const url = new URL(href, 'http://internal');
	url.searchParams.set('fullscreen', 'false');
	return `${url.pathname}${url.search}`;
}

/**
 * Toggle between fullscreen (default, param removed) and windowed
 * (`fullscreen=false`). Built from window.location — authoritative even
 * after shallow replaceState URL syncs, when page.url can be stale. A real
 * `goto` (replacing the history entry) so page.url and the root layout
 * chrome react; no load reads `fullscreen`, so no data refetch.
 * @param {boolean} isFullscreen - current mode
 */
export function toggleFullscreenMode(isFullscreen) {
	const url = new URL(window.location.href);
	if (isFullscreen) url.searchParams.set('fullscreen', 'false');
	else url.searchParams.delete('fullscreen');
	goto(`${url.pathname}${url.search}`, { noScroll: true, replaceState: true, keepFocus: true });
}
