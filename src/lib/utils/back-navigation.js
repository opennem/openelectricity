import { goto } from '$app/navigation';

/**
 * Go back through browser history when there is any (preserving the previous
 * page's filters and scroll position), otherwise — e.g. a direct link into the
 * page — replace the current entry with the given fallback route.
 * @param {string} fallbackHref
 */
export function backOr(fallbackHref) {
	if (history.length > 1) {
		history.back();
	} else {
		goto(fallbackHref, { replaceState: true });
	}
}
