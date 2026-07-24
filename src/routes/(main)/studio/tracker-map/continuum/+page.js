/**
 * Continuum — page load.
 *
 * Dashboard params only (range/interval via the shared tracker-map scheme).
 * The camera — and therefore the band and the dominant region — is the mode
 * state and lives only in the map; encoding zoom/centre in the URL is a
 * production decision deliberately out of prototype scope.
 */

import { parseDashboardParams } from '../_shared/route-state.js';

/** @param {{ url: URL }} event */
export function load({ url }) {
	return {
		...parseDashboardParams(url),
		// Fullscreen by default (matches /facilities) — the root (main) layout
		// hides the global chrome unless the URL opts out with ?fullscreen=false.
		fullscreen: true
	};
}
