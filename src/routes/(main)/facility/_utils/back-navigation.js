import { backOr } from '$lib/utils/back-navigation.js';
import { windowedHref } from '$lib/utils/fullscreen-mode.js';

/**
 * Navigate back from a facility detail page: browser history when there is
 * any, otherwise the facilities page with this facility's pane open
 * (`?facility=` is read by /facilities to preselect the detail panel).
 * @param {string} [code] - facility code to preselect on the fallback route
 * @param {boolean} [windowed] - carry windowed mode onto the fallback route
 */
export function backToFacilities(code, windowed = false) {
	const href = code ? `/facilities?facility=${code}&view=list` : '/facilities?view=list';
	backOr(windowedHref(href, windowed));
}
