/**
 * Pure helpers for mapping raw `WheelEvent` deltas to pan/zoom semantics.
 *
 * Extracted from `InteractionLayer.svelte` so the math is unit-testable
 * without a DOM. The component calls these, then fires the resulting
 * `onpan(deltaMs)` / `onzoom(factor, centerMs)` callbacks.
 */

/** Tuned so a typical trackpad zoom feels natural at 1 wheel tick ≈ 1.002 factor. */
const ZOOM_BASE = 1.002;

/**
 * Decide whether a wheel event should pan or zoom based on which axis is
 * stronger. Ties go to zoom (vertical scroll is the common default on mice
 * without a horizontal wheel).
 *
 * @param {number} deltaX
 * @param {number} deltaY
 * @returns {'pan' | 'zoom'}
 */
export function classifyWheelIntent(deltaX, deltaY) {
	return Math.abs(deltaX) > Math.abs(deltaY) ? 'pan' : 'zoom';
}

/**
 * Map a horizontal wheel delta to a viewport pan in milliseconds. Right-scroll
 * (positive deltaX) advances forward in time, so we negate the delta.
 *
 * @param {number} deltaX - Raw `WheelEvent.deltaX`
 * @param {number} widthPx - Container width in pixels
 * @param {number} domainMs - Current viewport duration in ms (end - start)
 * @returns {number} Pan delta in ms (positive = future → past, negative = past → future)
 */
export function wheelPanDeltaMs(deltaX, widthPx, domainMs) {
	if (!widthPx || widthPx <= 0) return 0;
	if (!Number.isFinite(domainMs) || domainMs <= 0) return 0;
	const msPerPixel = domainMs / widthPx;
	return -deltaX * msPerPixel;
}

/**
 * Map a vertical wheel delta to a zoom factor. Scrolling up (negative deltaY)
 * zooms in (factor > 1); scrolling down zooms out (factor < 1).
 *
 * @param {number} deltaY
 * @returns {number}
 */
export function wheelZoomFactor(deltaY) {
	return Math.pow(ZOOM_BASE, -deltaY);
}
