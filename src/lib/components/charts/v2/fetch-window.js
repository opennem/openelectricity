/** Shared buffer calculations keep chart and provider requests identical. */

/**
 * Return the viewport buffer multiplier for an API interval.
 *
 * @param {string} interval - Native OE interval ('5m', '1h', '1d', '1M'…)
 * @returns {number}
 */
export function fetchBufferMultiplierForInterval(interval) {
	return interval === '5m' || interval === '1h' ? 1 : 3;
}

/**
 * Buffered fetch window for a viewport, right-clamped to `nowMs`.
 *
 * @param {number} startMs
 * @param {number} endMs
 * @param {number} multiplier - From `fetchBufferMultiplierForInterval`
 * @param {number} [nowMs]
 * @param {number} [maxBufferMs] - Optional per-side speculative buffer cap
 * @returns {{ start: number, end: number }}
 */
export function bufferedFetchWindow(
	startMs,
	endMs,
	multiplier,
	nowMs = Date.now(),
	maxBufferMs = Infinity
) {
	const buffer = Math.min((endMs - startMs) * multiplier, maxBufferMs);
	return { start: startMs - buffer, end: Math.min(endMs + buffer, nowMs) };
}

/**
 * @typedef {Object} ViewportManager
 * @property {string} interval
 * @property {string} metric
 * @property {(start: number, end: number, options?: { immediate?: boolean, priority?: 'low' }) => void} requestRange
 * @property {(start: number, end: number) => void} reconcileWindow
 */

/**
 * Whether the manager matches the current interval and metric.
 *
 * @param {{ interval: string, metric: string } | null | undefined} manager
 * @param {string} interval
 * @param {string} metric
 * @returns {boolean}
 */
export function viewportRequestAllowed(manager, interval, metric) {
	return !!manager && manager.interval === interval && manager.metric === metric;
}

/**
 * The window a viewport fetches: the standard buffer, or exactly the viewport
 * for bounded sources (the time-of-day profile) that must never widen.
 *
 * @param {number} startMs
 * @param {number} endMs
 * @param {string} interval
 * @param {boolean} [exact]
 * @returns {{ start: number, end: number }}
 */
export function fetchWindowFor(startMs, endMs, interval, exact = false) {
	return exact
		? { start: startMs, end: endMs }
		: bufferedFetchWindow(startMs, endMs, fetchBufferMultiplierForInterval(interval));
}

/**
 * Request the standard buffered window when the manager identity matches.
 *
 * @param {ViewportManager | null | undefined} manager
 * @param {number} startMs
 * @param {number} endMs
 * @param {string} interval
 * @param {string} metric
 * @param {{ immediate?: boolean, priority?: 'low', exact?: boolean }} [options] - `exact`
 *   requests the viewport itself instead of the buffered window
 * @returns {boolean}
 */
export function requestBufferedRange(manager, startMs, endMs, interval, metric, options = {}) {
	if (!manager || !viewportRequestAllowed(manager, interval, metric)) return false;
	const { exact = false, ...request } = options;
	const window = fetchWindowFor(startMs, endMs, interval, exact);
	manager.requestRange(window.start, window.end, request);
	return true;
}

/**
 * Reconcile the standard buffered window when the manager identity matches.
 *
 * @param {ViewportManager | null | undefined} manager
 * @param {number} startMs
 * @param {number} endMs
 * @param {string} interval
 * @param {string} metric
 * @param {boolean} [exact] - Reconcile the viewport itself, not the buffered window
 * @returns {boolean}
 */
export function reconcileBufferedRange(manager, startMs, endMs, interval, metric, exact = false) {
	if (!manager || !viewportRequestAllowed(manager, interval, metric)) return false;
	const window = fetchWindowFor(startMs, endMs, interval, exact);
	manager.reconcileWindow(window.start, window.end);
	return true;
}
