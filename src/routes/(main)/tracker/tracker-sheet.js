import { getContext, setContext } from 'svelte';

/**
 * On phones the Tracker's table panel sits in a persistent bottom sheet
 * (`TrackerSplitLayout`): minimised to its header when the table is closed,
 * at the peek height (or full, if pulled up) when open. Panel headers read
 * this to act as the sheet's drag handle and expand/minimise toggle instead
 * of the docked panel's close control.
 *
 * @typedef {{
 *   readonly active: boolean,
 *   readonly minimised: boolean,
 *   toggle: () => void
 * }} TrackerSheet
 */

const KEY = Symbol('tracker-sheet');

/** @param {TrackerSheet} sheet */
export function setTrackerSheet(sheet) {
	setContext(KEY, sheet);
}

/** @returns {TrackerSheet | undefined} */
export function getTrackerSheet() {
	return getContext(KEY);
}
