const DAY_MS = 86_400_000;
const FULL_HISTORY_MS = 11_000 * DAY_MS;

/**
 * Widen the live cache and warm daily plus full-history data for one metric.
 * @param {string} metric
 */
export function createTrackerPrefetchPlan(metric) {
	return {
		widenMultiplier: 3,
		grains: [
			{ interval: '1d', metric, windowMs: 30 * DAY_MS },
			{ interval: '1M', metric, windowMs: FULL_HISTORY_MS }
		]
	};
}
