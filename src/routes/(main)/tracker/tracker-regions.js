/**
 * Tracker-local region options: the shared Explorer list plus an
 * "All Regions" (NEM+WEM combined, value 'au') entry at the top, which is the
 * tracker's default scope.
 *
 * Deliberately NOT added to `$lib/regions.js` — that list feeds the scenarios
 * filters, the studio explorer and the positional `regionsNemOnlyOptions` /
 * `regionsOnly` derivations, none of which can handle a two-network scope.
 */

import { regionOptions } from '$lib/regions.js';

export const DEFAULT_REGION = 'au';

export const TRACKER_REGION_OPTIONS = [
	{
		value: 'au',
		label: 'All Regions',
		shortLabel: 'AU',
		description: 'NEM and WEM combined'
	},
	...regionOptions
];

const NEM_STATE_VALUES = ['nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];

/** Nested display options; validation and label lookups use the flat list above. */
export const TRACKER_REGION_TREE = TRACKER_REGION_OPTIONS.filter(
	(option) => !NEM_STATE_VALUES.includes(option.value)
).map((option) => {
	if (option.value === 'au') return { ...option, divider: true };
	if (option.value === '_all') {
		return {
			...option,
			children: TRACKER_REGION_OPTIONS.filter((o) => NEM_STATE_VALUES.includes(o.value))
		};
	}
	return option;
});

/**
 * Whole-of-network scopes — 'au' (NEM+WEM) and '_all' (whole NEM). These
 * aggregate every region, so per-region treatments (map highlight, single
 * region chips/corridors) don't apply.
 * @param {string} region
 */
export function isWholeNetworkScope(region) {
	return region === 'au' || region === '_all';
}

/**
 * Whether a scope has a spot price — every scope except 'au' (no national
 * spot price exists).
 * @param {string} region
 */
export function hasSpotPrice(region) {
	return region !== 'au';
}
