import { EMPTY_CELL } from './table-format.js';

/** Shared presentation for the Tracker's fuel technology, region and date-comparison tables. */
export const TABLE_HEADER_CELL = 'border-b border-warm-grey py-3 align-top font-medium';
export const TABLE_ROW = 'group cursor-pointer text-sm hover:bg-light-warm-grey';
export const TABLE_SWATCH = 'size-5 shrink-0 rounded-sm border';
export const TABLE_EMPTY_SWATCH = `${TABLE_SWATCH} border-mid-warm-grey group-hover:border-mid-grey bg-transparent`;

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
