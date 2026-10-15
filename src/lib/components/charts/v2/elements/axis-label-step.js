/** Approximate width (px) of one character of the axis's small label type. */
const CHAR_PX = 5.5;
/** Clear space (px) kept between neighbouring labels. */
const LABEL_GAP_PX = 10;

/**
 * Every how many ticks an x-axis label fits without colliding: 1 shows
 * them all; 2 every other one, and so on. Labels are measured by their
 * length in characters, so the result needs no layout pass; the gridlines
 * and tick marks stay on every tick.
 *
 * @param {number[]} positions - Tick x positions in pixels, in order
 * @param {string[]} labels - The formatted labels, in the same order
 * @returns {number}
 */
export function axisLabelStep(positions, labels) {
	if (positions.length < 2) return 1;
	let spacing = Infinity;
	for (let i = 1; i < positions.length; i++) {
		spacing = Math.min(spacing, Math.abs(positions[i] - positions[i - 1]));
	}
	if (!(spacing > 0) || !Number.isFinite(spacing)) return 1;
	const longest = Math.max(...labels.map((label) => label.length));
	return Math.max(1, Math.ceil((longest * CHAR_PX + LABEL_GAP_PX) / spacing));
}
