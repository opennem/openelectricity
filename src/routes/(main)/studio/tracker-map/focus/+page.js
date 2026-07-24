/**
 * Focus prototype — page load.
 *
 * Two URL layers restore together: the shared dashboard params (region /
 * range / interval, resolved to concrete seed viewport dates by
 * `parseDashboardParams`) and the focus stack (`?focus=`, see
 * `focus-state.js`). The `region` param is written derived-from-focus by the
 * page, so on restore the two always agree; the focus object is the source of
 * truth for what the dashboard is about.
 */

import { parseDashboardParams } from '../_shared/route-state.js';
import { parseFocusParam } from './focus-state.js';

/**
 * @param {Object} params
 * @param {URL} params.url
 */
export function load({ url }) {
	return {
		...parseDashboardParams(url),
		focus: parseFocusParam(url.searchParams.get('focus')),
		// Fullscreen by default (matches /facilities) — the root (main) layout
		// hides the global chrome unless the URL opts out with ?fullscreen=false.
		fullscreen: true
	};
}
