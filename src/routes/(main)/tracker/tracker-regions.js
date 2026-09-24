/**
 * Tracker-local region options: the shared Explorer list plus the combined
 * "All Regions" (NEM+WEM, value 'au') scope at the top. The tracker's default
 * scope is the NEM (`DEFAULT_REGION` in `tracker-model.js`).
 *
 * The combined scope lives in `$lib/regions.js` as `allRegionsOption` but is
 * deliberately NOT part of `regionOptions` — that list feeds the scenarios
 * filters, the studio explorer and the positional `regionsNemOnlyOptions` /
 * `regionsOnly` derivations, none of which can handle a two-network scope.
 */

import { regionLabel as sharedRegionLabel, regionOptionsWithAu } from '$lib/regions.js';

export { hasSpotPrice } from '$lib/regions.js';

/**
 * Tracker display names that differ from the shared labels (the scenarios and
 * records filters keep "NEM Regions" / "Western Australia").
 * @type {Record<string, string>}
 */
const TRACKER_LABELS = {
	_all: 'National Electricity Market',
	wem: 'Western Australia (SWIS)'
};

/**
 * A shared region option with its tracker display name applied.
 * @template {{ value: string, label: string }} T
 * @param {T} option
 * @returns {T}
 */
export function withTrackerLabel(option) {
	const label = TRACKER_LABELS[option.value];
	return label ? { ...option, label } : option;
}

export const TRACKER_REGION_OPTIONS = regionOptionsWithAu.map(withTrackerLabel);

/**
 * Tracker display label for a region value, falling back to the value itself.
 * @param {string} value
 */
export function regionLabel(value) {
	return sharedRegionLabel(value, TRACKER_REGION_OPTIONS);
}

/** Every selectable scope value — the URL validation list. */
export const TRACKER_REGION_VALUES = TRACKER_REGION_OPTIONS.map((option) => option.value);

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
