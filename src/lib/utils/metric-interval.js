/**
 * Metric/Interval threshold logic for facility-style time-series charts.
 *
 * Maps a viewport duration (in days) to the correct OE API metric
 * (`power` | `energy`) and a **native** interval (`5m` | `1d` | `1M` | `1y`),
 * with hysteresis so continuous zoom doesn't thrash near a threshold, plus a
 * derivation of the chart's display interval (the client-side aggregation level
 * layered on top of the fetched API interval).
 *
 * The auto-switch ladder is `5m ↔ 1d ↔ 1M ↔ 1y` — only native fetch intervals,
 * so each switch yields a valid single `ChartDataManager` request. Coarser
 * grains (week, quarter, season, half-year, fin-year) are explicit picker
 * choices (see `range-interval-config.js`), never auto-selected by pan/zoom.
 *
 * Lives in `$lib/utils/` so any chart route can consume the same logic; direct
 * callers: `/facilities` detail panel, `/facility/[code]`, `/studio/explorer`.
 */

// ── Threshold constants ──────────────────────────────────────────────

/** Days below which we use power/5m. */
export const POWER_THRESHOLD = 10;
/** Days at which we switch from energy/1d to energy/1M. */
export const MONTHLY_THRESHOLD = 365;
/** Days at which we switch from energy/1M to energy/1y. */
export const YEARLY_THRESHOLD = 1825;

// Hysteresis zoom-in thresholds (lower than the zoom-out ones, so a small pan
// near the boundary doesn't flip back and forth).
const HYST_YEARLY_TO_MONTHLY = 1500;
const HYST_MONTHLY_TO_DAILY = 300;
// UX choice: hold the coarser energy view until the zoom is comfortably in
// power territory. As a bonus the switch fetch (viewport + 1× pan buffer each
// side, so 3× the span) fits OE_API_MAX_RANGE_DAYS['5m'] in one request —
// ChartDataManager batches over-cap spans, so that's latency, not validity.
const HYST_DAILY_TO_POWER = 8;

/**
 * Determine the metric and native API interval for a given number of days.
 * Memoryless — used on initial load and when a range preset / custom date range
 * is selected. For pan/zoom use `getHysteresisSwitch` instead.
 *
 * @param {number} days
 * @returns {{ metric: string, interval: string }}
 */
export function getMetricIntervalForDays(days) {
	if (days < POWER_THRESHOLD) {
		return { metric: 'power', interval: '5m' };
	}
	if (days < MONTHLY_THRESHOLD) {
		return { metric: 'energy', interval: '1d' };
	}
	if (days < YEARLY_THRESHOLD) {
		return { metric: 'energy', interval: '1M' };
	}
	return { metric: 'energy', interval: '1y' };
}

/**
 * Given the *current* metric/interval and the viewport duration, decide whether
 * a switch is needed (with hysteresis). Returns `null` when no switch is needed,
 * otherwise `{ metric, interval }`. Operates only on the native ladder
 * `5m ↔ 1d ↔ 1M ↔ 1y`.
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
		durationDays >= MONTHLY_THRESHOLD
	) {
		targetInterval = '1M';
	} else if (
		currentMetric === 'energy' &&
		currentInterval === '1M' &&
		durationDays >= YEARLY_THRESHOLD
	) {
		targetInterval = '1y';
	}
	// Zoom-in thresholds (finer interval, with hysteresis gap).
	else if (
		currentMetric === 'energy' &&
		currentInterval === '1y' &&
		durationDays < HYST_YEARLY_TO_MONTHLY
	) {
		targetInterval = '1M';
	} else if (
		currentMetric === 'energy' &&
		currentInterval === '1M' &&
		durationDays < HYST_MONTHLY_TO_DAILY
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
 * Resolve the final metric/interval for a viewport duration by walking the
 * hysteresis ladder to convergence. A single `getHysteresisSwitch` step moves
 * one rung, which is right for the incremental mid-gesture case it was built
 * for — but a gesture that settles after crossing several thresholds (a deep
 * zoom from "All" straight down to days) needs the full walk, else the grain
 * lands one rung short and sticks there until the next gesture.
 *
 * Terminates: each step moves monotonically toward the band containing
 * `durationDays` (the out-threshold of every rung exceeds its in-threshold,
 * so a step can never reverse). Returns `null` when no switch is needed.
 *
 * @param {string} currentMetric
 * @param {string} currentInterval
 * @param {number} durationDays
 * @returns {{ metric: string, interval: string } | null}
 */
export function getHysteresisTarget(currentMetric, currentInterval, durationDays) {
	let metric = currentMetric;
	let interval = currentInterval;
	let next;
	while ((next = getHysteresisSwitch(metric, interval, durationDays))) {
		metric = next.metric;
		interval = next.interval;
	}
	if (metric === currentMetric && interval === currentInterval) return null;
	return { metric, interval };
}

/**
 * Display interval (client-side aggregation level layered on top of the fetched
 * API interval). The chart fetches at `interval` and renders at the returned
 * display interval — e.g. fetched power/5m renders as 5m (raw) or 30m
 * (averaged); fetched energy/1d can render as 1d or 1M (summed). Native coarse
 * intervals (1M, 1y) render at their own grain.
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
	// Native coarse API intervals (1M, 1y, …) — display matches the fetch grain.
	return interval;
}
