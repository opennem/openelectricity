/**
 * One-finger touch on a chart that isn't engaged for pan/zoom. The chart
 * sets `touch-action: pan-y`, so the browser keeps vertical swipes (the page
 * scrolls) and hands horizontal drags to the chart: a drag scrubs the
 * readout across time and a tap pins one.
 */

/** Movement (px) a press may make and still count as a tap. */
export const TAP_THRESHOLD = 8;

/**
 * How long (ms) after a touch ends the browser's emulated mouse events
 * (mousemove, click) are ignored, so one tap isn't handled twice.
 */
export const EMULATED_MOUSE_MS = 800;

/**
 * What a one-finger press has become, from its movement since it started.
 * 'pending' until it moves past the tap threshold; then 'scrub' when the
 * movement is mostly horizontal, 'scroll' when mostly vertical (the browser
 * takes those over).
 * @param {number} dx
 * @param {number} dy
 * @returns {'pending' | 'scrub' | 'scroll'}
 */
export function classifyTouchDrag(dx, dy) {
	const ax = Math.abs(dx);
	const ay = Math.abs(dy);
	if (ax < TAP_THRESHOLD && ay < TAP_THRESHOLD) return 'pending';
	return ax > ay ? 'scrub' : 'scroll';
}

/**
 * Tracks the end of the last touch so mouse handlers can skip the
 * emulated events that follow it.
 */
export function createEmulatedMouseGuard() {
	let lastTouchEnd = -Infinity;
	return {
		/** Call when a touch pointer lifts or is cancelled. */
		touchEnded() {
			lastTouchEnd = performance.now();
		},
		/** True while mouse events are likely emulated from a touch. */
		get active() {
			return performance.now() - lastTouchEnd < EMULATED_MOUSE_MS;
		}
	};
}
