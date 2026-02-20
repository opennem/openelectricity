/**
 * Metric/Interval threshold logic for Facility Explorer.
 *
 * Centralises the rules that map a viewport duration (in days) to
 * the correct API metric (power | energy) and interval (5m | 1d | 3M | 1y),
 * including hysteresis gaps so continuous zoom doesn't flip rapidly.
 */

// ── Threshold constants ──────────────────────────────────────────────

/** Days below which we use power/5m */
export const POWER_THRESHOLD = 15;
/** Days at which we switch from energy/1d to energy/3M */
export const QUARTERLY_THRESHOLD = 365;
/** Days at which we switch from energy/3M to energy/1y */
export const YEARLY_THRESHOLD = 1825;

// Hysteresis zoom-in thresholds (lower than the zoom-out ones)
const HYST_YEARLY_TO_QUARTERLY = 1500;
const HYST_QUARTERLY_TO_DAILY = 300;
const HYST_DAILY_TO_POWER = 13;

/**
 * Determine the metric and interval for a given number of days.
 * Used on initial load and when a range preset is selected.
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
 * whether a switch is needed (with hysteresis).
 *
 * Returns `null` when no switch is needed, otherwise `{ metric, interval }`.
 *
 * @param {string} currentMetric
 * @param {string} currentInterval
 * @param {number} durationDays
 * @returns {{ metric: string, interval: string } | null}
 */
export function getHysteresisSwitch(currentMetric, currentInterval, durationDays) {
	let targetMetric = currentMetric;
	let targetInterval = currentInterval;

	// Zoom-out thresholds (coarser interval)
	if (currentMetric === 'power' && durationDays >= POWER_THRESHOLD) {
		targetMetric = 'energy';
		targetInterval = '1d';
	} else if (currentMetric === 'energy' && currentInterval === '1d' && durationDays >= QUARTERLY_THRESHOLD) {
		targetInterval = '3M';
	} else if (currentMetric === 'energy' && currentInterval === '3M' && durationDays >= YEARLY_THRESHOLD) {
		targetInterval = '1y';
	}
	// Zoom-in thresholds (finer interval, with hysteresis gap)
	else if (currentMetric === 'energy' && currentInterval === '1y' && durationDays < HYST_YEARLY_TO_QUARTERLY) {
		targetInterval = '3M';
	} else if (currentMetric === 'energy' && currentInterval === '3M' && durationDays < HYST_QUARTERLY_TO_DAILY) {
		targetInterval = '1d';
	} else if (currentMetric === 'energy' && currentInterval === '1d' && durationDays <= HYST_DAILY_TO_POWER) {
		targetMetric = 'power';
		targetInterval = '5m';
	}

	if (targetMetric !== currentMetric || targetInterval !== currentInterval) {
		return { metric: targetMetric, interval: targetInterval };
	}
	return null;
}
