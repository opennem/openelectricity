/**
 * The fuel-tech table's show/hide rules for chart series and the generation
 * chart's URL-owned overlays. Pure: the canvas applies the result through the
 * session, which decides the history behaviour (solo/restore push one entry,
 * a single overlay toggle replaces).
 */

/** @typedef {import('./types.js').TrackerOverlay} TrackerOverlay */

/**
 * @typedef {Object} Visibility
 * @property {string[]} hiddenSeries - Group ids toggled off in the charts
 * @property {TrackerOverlay[]} overlays - Enabled generation-chart overlays
 * @property {string[]} rowIds - Every group id in the current table
 */

/**
 * Toggle one fuel-tech series. Solo hides every other row and clears the
 * overlays; toggling off the last visible row restores everything instead
 * of leaving an empty chart.
 * @param {Visibility} current
 * @param {string} series
 * @param {boolean} [exclusive] - Solo the series
 * @returns {{ hiddenSeries: string[], overlays: TrackerOverlay[] }}
 */
export function toggleSeriesVisibility(current, series, exclusive = false) {
	const { hiddenSeries, overlays, rowIds } = current;
	if (exclusive) return { hiddenSeries: rowIds.filter((id) => id !== series), overlays: [] };
	const visibleCount = rowIds.filter((id) => !hiddenSeries.includes(id)).length;
	if (!hiddenSeries.includes(series) && visibleCount === 1)
		return { hiddenSeries: [], overlays: [] };
	return {
		hiddenSeries: hiddenSeries.includes(series)
			? hiddenSeries.filter((id) => id !== series)
			: [...hiddenSeries, series],
		overlays
	};
}

/**
 * Toggle one overlay. Solo hides every fuel-tech row and leaves only that
 * overlay drawn.
 * @param {Visibility} current
 * @param {TrackerOverlay} overlay
 * @param {boolean} [exclusive] - Solo the overlay
 * @returns {{ hiddenSeries: string[], overlays: TrackerOverlay[] }}
 */
export function toggleOverlayVisibility(current, overlay, exclusive = false) {
	const { hiddenSeries, overlays, rowIds } = current;
	if (exclusive) return { hiddenSeries: [...rowIds], overlays: [overlay] };
	return {
		hiddenSeries,
		overlays: overlays.includes(overlay)
			? overlays.filter((item) => item !== overlay)
			: [...overlays, overlay]
	};
}
