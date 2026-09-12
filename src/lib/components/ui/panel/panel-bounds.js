/**
 * Size bounds for a docked side panel measured as a percentage of its
 * container. The panel never shrinks below a usable pixel width, and on wide
 * layouts it leaves `reservedPx` for the content beside it; narrow layouts
 * let it cover most of the screen instead.
 *
 * @param {{
 *   containerWidth: number,
 *   minPx: number,
 *   reservedPx: number,
 *   maxPct: number,
 *   wide: boolean,
 *   narrowMaxPct: number
 * }} layout
 * @returns {{ min: number, max: number }} Percentages of the container width
 */
export function percentPanelBounds({
	containerWidth,
	minPx,
	reservedPx,
	maxPct,
	wide,
	narrowMaxPct
}) {
	const min = Math.min(80, containerWidth ? (minPx / containerWidth) * 100 : 30);
	const max =
		wide && containerWidth
			? Math.max(min, Math.min(maxPct, ((containerWidth - reservedPx) / containerWidth) * 100))
			: narrowMaxPct;
	return { min, max };
}
