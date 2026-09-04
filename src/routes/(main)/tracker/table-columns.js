/**
 * Geometry for the fuel-tech table's narrow-width column carousel. The
 * Technology column is pinned; the value columns scroll horizontally inside
 * the region to its right. These helpers turn scroll offsets and header boxes
 * into "which columns are in view" and "where to scroll for a column", so the
 * tab strip can double as the scroll-position indicator.
 *
 * Pure maths — no DOM, no Svelte.
 */

/** @typedef {{ offsetLeft: number, width: number }} ColumnBox */

/**
 * Which value columns sit fully inside the visible value region — the
 * scroller viewport minus the pinned Technology column. When none does (a
 * region narrower than a column, or a frame mid-scroll) the column with the
 * largest visible overlap is reported instead, so exactly one tab stays lit.
 *
 * @param {{
 *   scrollLeft: number,
 *   viewportWidth: number,
 *   techWidth: number,
 *   columns: ColumnBox[],
 *   tolerance?: number
 * }} view - Column boxes are in scroll (table) coordinates, like `offsetLeft`
 * @returns {boolean[]}
 */
export function visibleValueColumns({
	scrollLeft,
	viewportWidth,
	techWidth,
	columns,
	tolerance = 1
}) {
	const regionStart = scrollLeft + techWidth;
	const regionEnd = scrollLeft + viewportWidth;
	const inView = columns.map(
		(column) =>
			column.offsetLeft >= regionStart - tolerance &&
			column.offsetLeft + column.width <= regionEnd + tolerance
	);
	if (columns.length === 0 || inView.some(Boolean)) return inView;

	let best = -1;
	let bestOverlap = -Infinity;
	columns.forEach((column, index) => {
		const overlap =
			Math.min(column.offsetLeft + column.width, regionEnd) -
			Math.max(column.offsetLeft, regionStart);
		if (overlap > bestOverlap) {
			bestOverlap = overlap;
			best = index;
		}
	});
	return columns.map((_, index) => index === best);
}

/**
 * The `scrollLeft` that puts a column at the left edge of the value region,
 * clamped to the scroll range — the same spot a mandatory snap will rest at.
 *
 * @param {ColumnBox} column
 * @param {{ techWidth: number, viewportWidth: number, tableWidth: number }} geometry
 * @returns {number}
 */
export function scrollTargetFor(column, { techWidth, viewportWidth, tableWidth }) {
	const maxScroll = Math.max(0, tableWidth - viewportWidth);
	return Math.max(0, Math.min(column.offsetLeft - techWidth, maxScroll));
}
