/**
 * Metric/Interval threshold logic for facility-style time-series charts.
 *
 * Maps a viewport duration (in days) to the correct OE API metric
 * (`power` | `energy`) and interval (`5m` | `1d` | `3M` | `1y`),
 * with hysteresis so continuous zoom doesn't thrash near a threshold,
 * plus a derivation of the chart's display interval (the client-side
 * aggregation level layered on top of the fetched API interval).
 *
 * Lives in `$lib/utils/` so any chart route can consume the same logic;
 * direct callers today: `/studio/facility-explorer`, `/studio/facility-detail`,
 * `/facility/[code]`.
 */

// ── Threshold constants ──────────────────────────────────────────────

/** Days below which we use power/5m. */
export const POWER_THRESHOLD = 15;
/** Days at which we switch from energy/1d to energy/3M. */
export const QUARTERLY_THRESHOLD = 365;
/** Days at which we switch from energy/3M to energy/1y. */
export const YEARLY_THRESHOLD = 1825;

// Hysteresis zoom-in thresholds (lower than the zoom-out ones, so a small
// pan near the boundary doesn't flip back and forth).
const HYST_YEARLY_TO_QUARTERLY = 1500;
const HYST_QUARTERLY_TO_DAILY = 300;
const HYST_DAILY_TO_POWER = 13;

/**
 * Determine the metric and API interval for a given number of days.
 * Memoryless — used on initial load and when a range preset / custom date
 * range is selected. For pan/zoom use `getHysteresisSwitch` instead.
 *
 * @param {number} days
 * @returns {{ metric: string, interval: string }}
 */
export function getMetricIntervalForDays(days) {
	if (days < POWER_THRESHOLD) {
		return { metric: 'power', interval: '5m' };
	}
	if (days < QUARTERLY_THRESHOLD) {
		return { metric: 'energy', interval: '1d' };
	}
	if (days <= YEARLY_THRESHOLD) {
		return { metric: 'energy', interval: '3M' };
	}
	return { metric: 'energy', interval: '1y' };
}

/**
 * Given the *current* metric/interval and the viewport duration, decide
 * whether a switch is needed (with hysteresis). Returns `null` when no
 * switch is needed, otherwise `{ metric, interval }`.
 *
 * @param {string} currentMetric
 * @param {string} currentInterval
 * @param {number} durationDays
 * @returns {{ metric: string, interval: string } | null}
 */
export function getHysteresisSwitch(currentMetric, currentInterval, durationDays) {
	let targetMetric = currentMetric;
	let targetInterval = currentInterval;

	// Zoom-out thresholds (coarser interval).
	if (currentMetric === 'power' && durationDays >= POWER_THRESHOLD) {
		targetMetric = 'energy';
		targetInterval = '1d';
	} else if (
		currentMetric === 'energy' &&
		currentInterval === '1d' &&
		durationDays >= QUARTERLY_THRESHOLD
	) {
		targetInterval = '3M';
	} else if (
		currentMetric === 'energy' &&
		currentInterval === '3M' &&
		durationDays >= YEARLY_THRESHOLD
	) {
		targetInterval = '1y';
	}
	// Zoom-in thresholds (finer interval, with hysteresis gap).
	else if (
		currentMetric === 'energy' &&
		currentInterval === '1y' &&
		durationDays < HYST_YEARLY_TO_QUARTERLY
	) {
		targetInterval = '3M';
	} else if (
		currentMetric === 'energy' &&
		currentInterval === '3M' &&
		durationDays < HYST_QUARTERLY_TO_DAILY
	) {
		targetInterval = '1d';
	} else if (
		currentMetric === 'energy' &&
		currentInterval === '1d' &&
		durationDays <= HYST_DAILY_TO_POWER
	) {
		targetMetric = 'power';
		targetInterval = '5m';
	}

	if (targetMetric !== currentMetric || targetInterval !== currentInterval) {
		return { metric: targetMetric, interval: targetInterval };
	}
	return null;
}

/**
 * Display interval (client-side aggregation level layered on top of the
 * fetched API interval). The chart fetches at `interval` and renders at
 * the returned display interval — e.g. fetched power/5m can render as 5m
 * (raw) or 30m (averaged); fetched energy/1d can render as 1d or 1M
 * (summed). Coarser API intervals (3M, 1y) have no further client-side
 * aggregation.
 *
 * @param {string} metric
 * @param {string} interval
 * @param {number} days
 * @returns {string}
 */
export function getDisplayIntervalForDays(metric, interval, days) {
	if (metric === 'power') {
		return days < 2 ? '5m' : '30m';
	}
	if (interval === '1d') {
		return days >= 366 ? '1M' : '1d';
	}
	// '3M' or '1y' API intervals — display matches the fetched grain.
	return interval;
}
