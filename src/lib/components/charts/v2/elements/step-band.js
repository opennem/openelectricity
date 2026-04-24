/**
 * Pure math for step-after hover bands.
 *
 * For a dataset rendered with d3's `curveStepAfter`, the visual bar for the
 * point at index `i` spans from `T_i` (its own time) up to `T_{i+1}` (the
 * next point's time). The last point has no next neighbour, so we extend
 * the bar by the same width as the interval before it — this matches the
 * phantom trailing point added in `StackedAreaChart.svelte` for the actual
 * path rendering.
 */

/**
 * @typedef {Object} StepBand
 * @property {number} startMs
 * @property {number} endMs
 */

/**
 * @param {number} index
 * @param {Array<{ time: number }>} dataset - Sorted by `time` ascending
 * @returns {StepBand | null}
 */
export function computeStepBand(index, dataset) {
	if (!dataset || dataset.length < 2) return null;
	if (index < 0 || index >= dataset.length) return null;

	const n = dataset.length;
	const startMs = dataset[index].time;

	// Last point: extrapolate using the previous interval
	if (index === n - 1) {
		const prevInterval = dataset[n - 1].time - dataset[n - 2].time;
		return { startMs, endMs: startMs + prevInterval };
	}

	return { startMs, endMs: dataset[index + 1].time };
}
