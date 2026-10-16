import { getContext, setContext } from 'svelte';

/**
 * On phones the Tracker's table panel opens in a sheet over the page
 * (`TrackerSplitLayout`), near full height, and closes away entirely. Panel
 * headers read this to act as the sheet's header: a drag handle, the panel's
 * own actions on the left, the title centred and a ✕ that closes the sheet,
 * instead of the docked panel's close control.
 *
 * @typedef {{
 *   readonly active: boolean,
 *   close: () => void
 * }} TrackerSheet
 */

const KEY = Symbol('tracker-sheet');
const NAV_KEY = Symbol('tracker-nav-bottom');

/** @param {TrackerSheet} sheet */
export function setTrackerSheet(sheet) {
	setContext(KEY, sheet);
}

/** @returns {TrackerSheet | undefined} */
export function getTrackerSheet() {
	return getContext(KEY);
}

/**
 * The shell shares where its top nav ends on screen (in px from the
 * viewport's top, 0 once it has scrolled away), so the phone table sheet
 * can open to just under it.
 * @param {() => number} navBottom
 */
export function setTrackerNavBottom(navBottom) {
	setContext(NAV_KEY, navBottom);
}

/** @returns {(() => number) | undefined} */
export function getTrackerNavBottom() {
	return getContext(NAV_KEY);
}
