/**
 * Keyboard inspection shared by the comparison line charts and stripes: the
 * arrow keys walk the visible periods, Enter or Space pins the current one
 * and Escape clears both. Pure so both renderers dispatch the same result.
 * @param {string} key - `KeyboardEvent.key`
 * @param {Array<{time: number}>} visible - Rows in the viewport, in time order
 * @param {number | null} hover @param {number | null} focus
 * @returns {{hover?: number | null, focus?: number | null} | null} - Null when the key is not handled
 */
export function inspectionStep(key, visible, hover, focus) {
	if (!visible.length) return null;
	const current = hover ?? focus ?? visible[visible.length - 1].time;
	const index = Math.max(
		0,
		visible.findIndex((row) => row.time === current)
	);
	if (key === 'ArrowLeft' || key === 'ArrowRight') {
		const step = key === 'ArrowLeft' ? -1 : 1;
		return { hover: visible[Math.max(0, Math.min(visible.length - 1, index + step))].time };
	}
	if (key === 'Enter' || key === ' ') return { focus: focus === current ? null : current };
	if (key === 'Escape') return { hover: null, focus: null };
	return null;
}
