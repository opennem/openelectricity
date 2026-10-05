import { EMPTY_CELL } from './table-format.js';

/** Shared presentation for the Tracker's fuel technology, region and date-comparison tables. */
export const TABLE_HEADER_CELL = 'border-b border-warm-grey py-3 align-top font-medium';
export const TABLE_ROW = 'group cursor-pointer text-sm hover:bg-light-warm-grey';
export const TABLE_SWATCH = 'size-5 shrink-0 rounded-sm border';
export const TABLE_EMPTY_SWATCH = `${TABLE_SWATCH} border-mid-warm-grey group-hover:border-mid-grey bg-transparent`;
/** Header controls (unit cycles, grouping menu) keep their text where the
 *  static labels sit: the negative margins cancel the hover padding. */
export const TABLE_HEADER_BUTTON =
	'-my-1 inline-flex cursor-pointer rounded-md px-1.5 py-1 transition-colors hover:bg-warm-grey focus-visible:outline focus-visible:outline-2 focus-visible:outline-dark-grey motion-reduce:transition-none';

/**
 * Bring a table's focused value columns (a hovered day, a percentile band's
 * bounds, a hovered chart's metric) into view beside its pinned first column.
 * Headers are found by `data-column`; the scroller's own snapping and
 * `scroll-smooth` (off under reduced motion) do the rest. Nothing moves while
 * the columns are already in view.
 * @param {HTMLElement} scroller @param {string[]} keys - First to last focused column
 */
export function scrollColumnsIntoView(scroller, keys) {
	if (!keys.length) return;
	/** @param {string} key */
	const headerFor = (key) => scroller.querySelector(`th[data-column="${CSS.escape(key)}"]`);
	const first = headerFor(keys[0]);
	const last = headerFor(keys[keys.length - 1]);
	const pinned = scroller.querySelector('th');
	if (
		!(first instanceof HTMLElement) ||
		!(last instanceof HTMLElement) ||
		!(pinned instanceof HTMLElement)
	)
		return;
	const left = first.offsetLeft - pinned.offsetWidth;
	const right = last.offsetLeft + last.offsetWidth;
	if (left < scroller.scrollLeft || right > scroller.scrollLeft + scroller.clientWidth)
		scroller.scrollTo({ left });
}

/** @param {number} scrollLeft */
export function pinnedTableEdge(scrollLeft) {
	return `sticky left-0 z-[1] border-r border-warm-grey after:pointer-events-none after:absolute after:inset-y-0 after:left-full after:w-6 after:bg-linear-to-r after:from-black/5 after:to-transparent after:transition-opacity after:duration-200 ${scrollLeft > 0 ? 'after:opacity-100' : 'after:opacity-0'}`;
}

/**
 * @param {string} text @param {boolean} last @param {string} [padding]
 * @param {boolean} [selected] - The inspected cell: white on OE red
 */
export function tableValueCell(text, last, padding = 'py-1.5', selected = false) {
	const colour = selected
		? 'bg-red text-white'
		: text === EMPTY_CELL
			? 'text-mid-grey'
			: 'text-dark-grey';
	return `${last ? 'pr-3 pl-2' : 'px-2'} ${padding} whitespace-nowrap text-right font-mono tabular-nums transition-opacity duration-300 ${colour}`;
}

const FOCUS_EDGE = '#353535';

/**
 * A focused row or column's outline, drawn per cell as inset shadows: under
 * `border-separate` a border would shift the layout, and a `<tr>` or column
 * can't carry one. Undefined when the cell has no outlined edge.
 * @param {{ top?: boolean, right?: boolean, bottom?: boolean, left?: boolean }} edges
 * @returns {string | undefined}
 */
export function focusEdges({ top, right, bottom, left }) {
	const shadows = [
		top && `inset 0 1px 0 ${FOCUS_EDGE}`,
		right && `inset -1px 0 0 ${FOCUS_EDGE}`,
		bottom && `inset 0 -1px 0 ${FOCUS_EDGE}`,
		left && `inset 1px 0 0 ${FOCUS_EDGE}`
	].filter(Boolean);
	return shadows.length ? shadows.join(', ') : undefined;
}

/** @typedef {{ focused: boolean, left: boolean, right: boolean }} ColumnFocus */

/**
 * Each value column's place in the focus: whether it is focused, and whether
 * its outline closes on the left or right. Adjacent focused columns (a
 * percentile band's two bounds) outline as one block.
 * @param {string[]} keys - The value columns, in order
 * @param {string[]} focusedKeys
 * @returns {ColumnFocus[]}
 */
export function columnFocusFor(keys, focusedKeys) {
	/** @param {number} i */
	const on = (i) => i >= 0 && i < keys.length && focusedKeys.includes(keys[i]);
	return keys.map((_, i) => {
		const focused = on(i);
		return { focused, left: focused && !on(i - 1), right: focused && !on(i + 1) };
	});
}

/** A value column header: fixed width, snapping, the last column's wider
 * right padding, and the focused column's tint.
 * @param {boolean} last @param {boolean} focused */
export function valueHeaderClass(last, focused) {
	return `w-[100px] snap-start text-right transition-colors ${last ? 'pr-3 pl-2' : 'px-2'} ${focused ? 'bg-warm-grey' : ''} ${TABLE_HEADER_CELL}`;
}

/** @param {ColumnFocus} column */
export function valueHeaderEdges(column) {
	return focusEdges({ top: column.focused, left: column.left, right: column.right });
}

/** A value cell: the focused column tints it, and where the focused row
 * crosses it the cell reads white on OE red.
 * @param {string} text @param {boolean} last @param {string} padding
 * @param {boolean} rowFocused @param {ColumnFocus} column */
export function valueCellClass(text, last, padding, rowFocused, column) {
	return `${tableValueCell(text, last, padding, column.focused && rowFocused)} ${column.focused && !rowFocused ? 'bg-light-warm-grey' : ''}`;
}

/** A value cell's outline: its row's top and bottom while the row is focused,
 * its column's sides, closing under the table's last row and beside its last
 * column.
 * @param {boolean} rowFocused @param {ColumnFocus} column
 * @param {{ last: boolean, lastRow: boolean }} position */
export function valueCellEdges(rowFocused, column, { last, lastRow }) {
	return focusEdges({
		top: rowFocused,
		bottom: rowFocused || (column.focused && lastRow),
		left: column.left,
		right: column.right || (rowFocused && last)
	});
}
