import { getContext, setContext } from 'svelte';

/**
 * The phone filter sheet: a page that gathers its filters into one bottom
 * sheet (the Tracker's) opts the sheet's subtree in with `setFilterSheet()`,
 * and renders the same controls there as in its filter bar. Inside it the
 * shared filter controls lay themselves out as the sheet's sections instead
 * of pills with their own pop-up panels:
 *
 *   - `FilterSelect`: a segmented switch for a flat list, or a collapsible
 *     radio list (`FilterRadioList`) for a nested one, folding once a pick
 *     lands;
 *   - `FilterDropdown`: a collapsible checkbox list (`FilterOptionList`);
 *   - `ChartRangeBar`: the range as the preset switch, with the custom dates
 *     (`DateRangePicker`, full width) beneath when the calendar is picked;
 *   - `DatePicker`: the input full width, its calendar inline beneath;
 *   - `FilterSheetSection`: a titled section around any other control;
 *   - `FilterBarGroup`: a bar-only wrapper or content, or sheet-only content.
 *
 * Every pick applies as it lands, so the page behind updates while the
 * sheet is open.
 */

const KEY = Symbol('filter-sheet');

/** Lay the shared filter controls in this subtree out as sheet sections. */
export function setFilterSheet() {
	setContext(KEY, true);
}

/** Whether the calling control sits in a filter sheet. */
export function inFilterSheet() {
	return getContext(KEY) === true;
}
