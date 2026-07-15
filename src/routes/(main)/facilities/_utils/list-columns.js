/**
 * Column geometry shared by the facilities List's sticky header and the
 * FacilityCard rows — one definition so the header and rows can't drift out of
 * alignment. `narrow` is the selected-state list treatment (the pane shrinks
 * beside the detail panel: region + metric columns dropped, the name takes the
 * space, badges overlap). Classes are sm:-prefixed — the header only renders
 * at sm+ and the rows only switch to the column grid at sm+.
 */

/** @param {boolean} narrow */
export function nameColumnClass(narrow) {
	return narrow ? 'sm:col-span-8' : 'sm:col-span-5';
}

/** @param {boolean} narrow */
export function metaColumnsClass(narrow) {
	return narrow
		? 'sm:col-span-4 sm:grid-cols-[1fr]'
		: 'sm:col-span-7 sm:grid-cols-[auto_1fr_auto_auto]';
}
