/**
 * Lens (modes) prototype — page load.
 *
 * URL state resolves through the shared tracker-map parser (region / range /
 * interval / group, or a custom start–end span) plus this prototype's explicit
 * mode token and optional active saved-view id. Data is fetched client-side
 * (charts via `ChartDataManager`, live grid via `createGridLive`), so the
 * loader stays a thin URL resolver.
 */

import { parseDashboardParams } from '../_shared/route-state.js';

/**
 * @param {Object} params
 * @param {URL} params.url
 */
export function load({ url }) {
	return {
		...parseDashboardParams(url),
		mode: url.searchParams.get('mode') === 'facilities' ? 'facilities' : 'grid',
		viewId: url.searchParams.get('view'),
		// Fullscreen by default (matches /facilities) — the root (main) layout
		// hides the global chrome unless the URL opts out with ?fullscreen=false.
		fullscreen: true
	};
}
