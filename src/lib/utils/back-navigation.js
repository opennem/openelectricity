import { goto, afterNavigate } from '$app/navigation';
import { isOpenElectricityHost } from '$lib/utils/environment.js';

/** Set once any client-side navigation happens, meaning the previous history
 * entry is an in-app page. Fallback signal for browsers without the
 * Navigation API. */
let hasInternalNavigation = false;

/**
 * Call once during root layout init so backOr() can tell in-app history
 * entries apart from external ones in browsers without the Navigation API.
 */
export function trackBackNavigation() {
	afterNavigate((navigation) => {
		if (navigation.from) hasInternalNavigation = true;
	});
}

/**
 * Whether this document was entered from an Open Electricity page — covers
 * cross-origin family sites like explore.openelectricity.org.au, plus the
 * current host for local dev and preview deploys.
 */
function referrerIsOpenElectricity() {
	if (!document.referrer) return false;
	const { hostname } = new URL(document.referrer);
	return hostname === location.hostname || isOpenElectricityHost(hostname);
}

/** Whether history.back() would land on an Open Electricity page. */
function previousEntryIsOpenElectricity() {
	if (history.length <= 1) return false;
	// Navigation API (not yet in TS lib.dom): canGoBack is true only when the
	// previous entry is same-origin; a cross-origin previous entry is allowed
	// only when the referrer says an OE page opened this document.
	const canGoBack = /** @type {any} */ (window).navigation?.canGoBack;
	return (canGoBack ?? hasInternalNavigation) || referrerIsOpenElectricity();
}

/**
 * Go back through browser history when the previous entry is an Open
 * Electricity page (preserving that page's filters and scroll position),
 * otherwise — e.g. arriving from an external site or a direct link — replace
 * the current entry with the given fallback route.
 * @param {string} fallbackHref
 */
export function backOr(fallbackHref) {
	if (previousEntryIsOpenElectricity()) {
		history.back();
	} else {
		goto(fallbackHref, { replaceState: true });
	}
}
