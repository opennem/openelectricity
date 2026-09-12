/**
 * Studio tracker region options: the shared Explorer list plus the combined
 * "All Regions" (NEM+WEM, value 'au') scope, which is this tracker's default.
 * The scope itself and the spot-price rule come from `$lib/regions.js`.
 */

import { regionOptionsWithAu } from '$lib/regions.js';

export { hasSpotPrice } from '$lib/regions.js';

export const DEFAULT_REGION = 'au';

export const TRACKER_REGION_OPTIONS = regionOptionsWithAu;

/**
 * Whole-of-network scopes — 'au' (NEM+WEM) and '_all' (whole NEM). These
 * aggregate every region, so per-region treatments (map highlight, single
 * region chips/corridors) don't apply.
 * @param {string} region
 */
export function isWholeNetworkScope(region) {
	return region === 'au' || region === '_all';
}
