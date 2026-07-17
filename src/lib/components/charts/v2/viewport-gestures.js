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

import { WHEEL_PAN_IDLE_MS } from './wheel-interaction.js';

/**
 * @typedef {Object} ViewportGesturesConfig
 * @property {() => { start: number, end: number }} viewport - Read the current viewport
 * @property {(start: number, end: number) => void} apply - Commit a new viewport
 *   (write local $state, or forward to `onviewportchange` for provider charts)
 * @property {(() => number) | null} [minDurationMs] - Zoom-in floor; omit for unclamped
 * @property {(() => number) | null} [maxDurationMs] - Zoom-out ceiling; omit for unclamped
 * @property {(() => number) | null} [minDateMs] - Left-edge floor (no data before this
 *   instant): pan and zoom never move the viewport start before it, and the
 *   effective max zoom-out duration becomes `now - minDateMs()`. Omit for unclamped.
 * @property {() => void} [onGestureStart] - Pan-gesture start (clear hover, set isPanning)
 * @property {() => void} [onGestureEnd] - Pan-gesture end
 * @property {((start: number, end: number) => void) | null} [onMove] - After every
 *   applied pan/zoom step — the charts hook their buffered `requestRange` here;
 *   provider charts omit it and fetch via their viewport effect instead
 * @property {((direction: -1 | 1, start: number, end: number) => void) | null} [onPanEnd] -
 *   Directional prefetch when a pan gesture ends: -1 panned toward the future
 *   (prefetch ahead), 1 toward the past (prefetch behind)
 * @property {((start: number, end: number) => void) | null} [onSettle] - Fired once
 *   when a gesture comes to rest on its final viewport: synchronously on pointer
 *   release / +/- button click, debounced for wheel streams (which have no end
 *   event of their own). Charts hook their stale-fetch cancellation + final
 *   fetch here. Programmatic setViewport never settles — the caller initiated it.
 * @property {number} [buttonZoomFactor] - Zoom step for the +/- buttons (default 1.5)
 */

/**
 * Wheel events arrive as a stream with no end marker — treat a step-free lull
 * this long as the gesture settling. Deliberately longer than InteractionLayer's
 * wheel-pan idle so its `onpanend` always wins for wheel pans.
 */
const WHEEL_SETTLE_MS = WHEEL_PAN_IDLE_MS + 50;

/**
 * Tolerance for the pinned check below — absorbs wall-clock drift between a
 * gesture's clamp-to-now and a later evaluation.
 */
const PINNED_EDGE_TOLERANCE_MS = 60 * 1000;

/**
 * Whether the viewport spans the whole [minDateMs, now] range — zoom-out is
 * exhausted even when a duration ceiling is out of reach (the coarse 50-year
 * ceiling exceeds the ~27 years between 1998 and today). Mirrors the edge
 * clamps in handlePan/handleZoom, so the buttons' disabled state and the
 * gesture maths can't drift apart.
 *
 * @param {number} startMs
 * @param {number} endMs
 * @param {number} minDateMs
 * @returns {boolean}
 */
export function isViewportPinned(startMs, endMs, minDateMs) {
	return startMs <= minDateMs && endMs >= Date.now() - PINNED_EDGE_TOLERANCE_MS;
}

/**
 * @param {ViewportGesturesConfig} config
 */
export function createViewportGestures(config) {
	const {
		viewport,
		apply,
		minDurationMs = null,
		maxDurationMs = null,
		minDateMs = null,
		onGestureStart,
		onGestureEnd,
		onMove = null,
		onPanEnd = null,
		onSettle = null,
		buttonZoomFactor = 1.5
	} = config;

	let lastPanDelta = 0;

	// ---- Settle tracking ----
	// True between handlePanStart and handlePanEnd (mouse drag, touch pan/pinch)
	// — those gestures settle on the definitive end event, not the wheel timer.
	let pointerGestureActive = false;
	// The viewport most recently applied by this factory. Settle reads this
	// rather than viewport(): provider charts apply via a parent callback, so a
	// synchronous read-back through props would see the pre-gesture value.
	/** @type {{ start: number, end: number } | null} */
	let lastApplied = null;
	// Whether a step has been applied since the last settle — a gesture that
	// moved nothing has nothing to settle.
	let settlePending = false;
	/** @type {ReturnType<typeof setTimeout> | null} */
	let settleTimer = null;

	function cancelSettleTimer() {
		if (settleTimer) {
			clearTimeout(settleTimer);
			settleTimer = null;
		}
	}

	function fireSettle() {
		cancelSettleTimer();
		if (!onSettle || !settlePending || !lastApplied) return;
		settlePending = false;
		onSettle(lastApplied.start, lastApplied.end);
	}

	function scheduleSettle() {
		if (!onSettle) return;
		cancelSettleTimer();
		settleTimer = setTimeout(fireSettle, WHEEL_SETTLE_MS);
	}

	/** @param {number} start @param {number} end */
	function trackStep(start, end) {
		lastApplied = { start, end };
		settlePending = true;
	}

	function handlePanStart() {
		pointerGestureActive = true;
		cancelSettleTimer();
		onGestureStart?.();
	}

	/**
	 * Shift the viewport by a drag delta. `deltaMs` is positive when dragging
	 * right, which moves backward in time.
	 * @param {number} deltaMs
	 */
	function handlePan(deltaMs) {
		const { start, end } = viewport();
		const duration = end - start;
		let newStart = start - deltaMs;
		let newEnd = end - deltaMs;

		// Don't allow panning past the present.
		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - duration;
		}

		// Don't allow panning before the data floor. Preserves the duration where
		// it fits; a legacy oversized viewport shrinks to [floor, now].
		const floor = minDateMs ? minDateMs() : null;
		if (floor !== null && newStart < floor) {
			newStart = floor;
			newEnd = Math.min(newStart + duration, now);
		}

		lastPanDelta = deltaMs;
		trackStep(newStart, newEnd);
		apply(newStart, newEnd);
		onMove?.(newStart, newEnd);
		// Wheel pans have no pointer gesture — settle on a lull instead.
		if (!pointerGestureActive) scheduleSettle();
	}

	function handlePanEnd() {
		pointerGestureActive = false;
		onGestureEnd?.();

		if (onPanEnd) {
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

		// After the prefetch, so the settle reconcile can clamp its window.
		fireSettle();
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
		const now = Date.now();
		const floor = minDateMs ? minDateMs() : null;

		let newDuration = duration / factor;
		if (minDurationMs) newDuration = Math.max(newDuration, minDurationMs());
		if (maxDurationMs) newDuration = Math.min(newDuration, maxDurationMs());
		// The viewport lives in [floor, now] — zooming out can't exceed that span.
		// Capping before anchoring means the two edge clamps below can't fight.
		if (floor !== null) newDuration = Math.min(newDuration, now - floor);

		const ratio = (centerMs - start) / duration;
		let newStart = centerMs - ratio * newDuration;
		let newEnd = newStart + newDuration;

		// Clamp to present.
		if (newEnd > now) {
			newEnd = now;
			newStart = now - newDuration;
		}

		// Clamp to the data floor — cannot re-violate `now`: newDuration ≤ now - floor.
		if (floor !== null && newStart < floor) {
			newStart = floor;
			newEnd = Math.min(newStart + newDuration, now);
		}

		trackStep(newStart, newEnd);
		apply(newStart, newEnd);
		onMove?.(newStart, newEnd);
		// Wheel zoom fires no end event at all — the lull timer is its settle.
		// Pinch zoom rides a pointer gesture and settles on handlePanEnd.
		if (!pointerGestureActive) scheduleSettle();
	}

	function zoomIn() {
		const { start, end } = viewport();
		handleZoom(buttonZoomFactor, (start + end) / 2);
		fireSettle(); // button clicks are discrete — settle immediately
	}

	function zoomOut() {
		const { start, end } = viewport();
		handleZoom(1 / buttonZoomFactor, (start + end) / 2);
		fireSettle();
	}

	/** Cancel any pending settle timer — call from the owner's unmount effect. */
	function dispose() {
		cancelSettleTimer();
	}

	return { handlePanStart, handlePan, handlePanEnd, handleZoom, zoomIn, zoomOut, dispose };
}
