/**
 * Shared viewport pan/zoom gesture handlers.
 *
 * FacilityChart, NetworkChart and the facility providers all implement the
 * same maths — invert the drag delta, clamp the right edge to "now", anchor
 * zoom at the pointer, prefetch in the pan direction — differing only in how
 * the new viewport is applied (local $state vs a parent callback), whether the
 * zoom duration is clamped, and what fetching happens on movement. This
 * factory holds the maths once; the variants are configuration.
 *
 * Plain JS, no runes: viewport state is only read inside event handlers, so
 * reactive tracking isn't needed (and the callbacks may read $state/$derived
 * freely — handler calls are untracked contexts).
 */

/**
 * @typedef {Object} ViewportGesturesConfig
 * @property {() => { start: number, end: number }} viewport - Read the current viewport
 * @property {(start: number, end: number) => void} apply - Commit a new viewport
 *   (write local $state, or forward to `onviewportchange` for provider charts)
 * @property {(() => number) | null} [minDurationMs] - Zoom-in floor; omit for unclamped
 * @property {(() => number) | null} [maxDurationMs] - Zoom-out ceiling; omit for unclamped
 * @property {() => void} [onGestureStart] - Pan-gesture start (clear hover, set isPanning)
 * @property {() => void} [onGestureEnd] - Pan-gesture end
 * @property {((start: number, end: number) => void) | null} [onMove] - After every
 *   applied pan/zoom step — the charts hook their buffered `requestRange` here;
 *   provider charts omit it and fetch via their viewport effect instead
 * @property {((direction: -1 | 1, start: number, end: number) => void) | null} [onPanEnd] -
 *   Directional prefetch when a pan gesture ends: -1 panned toward the future
 *   (prefetch ahead), 1 toward the past (prefetch behind)
 * @property {number} [buttonZoomFactor] - Zoom step for the +/- buttons (default 1.5)
 */

/**
 * @param {ViewportGesturesConfig} config
 */
export function createViewportGestures(config) {
	const {
		viewport,
		apply,
		minDurationMs = null,
		maxDurationMs = null,
		onGestureStart,
		onGestureEnd,
		onMove = null,
		onPanEnd = null,
		buttonZoomFactor = 1.5
	} = config;

	let lastPanDelta = 0;

	function handlePanStart() {
		onGestureStart?.();
	}

	/**
	 * Shift the viewport by a drag delta. `deltaMs` is positive when dragging
	 * right, which moves backward in time.
	 * @param {number} deltaMs
	 */
	function handlePan(deltaMs) {
		const { start, end } = viewport();
		let newStart = start - deltaMs;
		let newEnd = end - deltaMs;

		// Don't allow panning past the present.
		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - (end - start);
		}

		lastPanDelta = deltaMs;
		apply(newStart, newEnd);
		onMove?.(newStart, newEnd);
	}

	function handlePanEnd() {
		onGestureEnd?.();
		if (!onPanEnd) return;

		const { start, end } = viewport();
		const now = Date.now();
		if (lastPanDelta < 0 && end < now) {
			// Was panning left (toward the future) — prefetch ahead.
			onPanEnd(-1, start, end);
		} else if (lastPanDelta > 0) {
			// Was panning right (toward the past) — prefetch behind.
			onPanEnd(1, start, end);
		}
	}

	/**
	 * Scale the viewport around an anchor point, keeping `centerMs` at the same
	 * screen proportion.
	 * @param {number} factor - >1 zooms in, <1 zooms out
	 * @param {number} centerMs
	 */
	function handleZoom(factor, centerMs) {
		const { start, end } = viewport();
		const duration = end - start;

		let newDuration = duration / factor;
		if (minDurationMs) newDuration = Math.max(newDuration, minDurationMs());
		if (maxDurationMs) newDuration = Math.min(newDuration, maxDurationMs());

		const ratio = (centerMs - start) / duration;
		let newStart = centerMs - ratio * newDuration;
		let newEnd = newStart + newDuration;

		// Clamp to present.
		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - newDuration;
		}

		apply(newStart, newEnd);
		onMove?.(newStart, newEnd);
	}

	function zoomIn() {
		const { start, end } = viewport();
		handleZoom(buttonZoomFactor, (start + end) / 2);
	}

	function zoomOut() {
		const { start, end } = viewport();
		handleZoom(1 / buttonZoomFactor, (start + end) / 2);
	}

	return { handlePanStart, handlePan, handlePanEnd, handleZoom, zoomIn, zoomOut };
}
