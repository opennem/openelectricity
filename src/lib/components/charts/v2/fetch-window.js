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
 * @returns {{ start: number, end: number }}
 */
export function bufferedFetchWindow(startMs, endMs, multiplier, nowMs = Date.now()) {
	const buffer = (endMs - startMs) * multiplier;
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
 * Request the standard buffered window when the manager identity matches.
 *
 * @param {ViewportManager | null | undefined} manager
 * @param {number} startMs
 * @param {number} endMs
 * @param {string} interval
 * @param {string} metric
 * @param {{ immediate?: boolean, priority?: 'low' }} [options]
 * @returns {boolean}
 */
export function requestBufferedRange(manager, startMs, endMs, interval, metric, options) {
	if (!manager || !viewportRequestAllowed(manager, interval, metric)) return false;
	const window = bufferedFetchWindow(startMs, endMs, fetchBufferMultiplierForInterval(interval));
	manager.requestRange(window.start, window.end, options);
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
 * @returns {boolean}
 */
export function reconcileBufferedRange(manager, startMs, endMs, interval, metric) {
	if (!manager || !viewportRequestAllowed(manager, interval, metric)) return false;
	const window = bufferedFetchWindow(startMs, endMs, fetchBufferMultiplierForInterval(interval));
	manager.reconcileWindow(window.start, window.end);
	return true;
}
