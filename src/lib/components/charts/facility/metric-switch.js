/**
 * Shared power/energy metric switching logic for the facility chart.
 *
 * Given the current metric/interval state and a viewport duration in days,
 * returns the target metric/interval (switch on zoom crossing 13/15-day
 * thresholds) and the appropriate displayInterval for that duration.
 *
 * Hysteresis: we switch power→energy at ≥15 days and energy→power at ≤13
 * days so small wobbles around 14 days don't thrash between the two.
 *
 * @param {{ metric: string, interval: string, durationDays: number }} input
 * @returns {{
 *   metric: string,
 *   interval: string,
 *   displayInterval: string,
 *   changed: boolean
 * }}
 */
export function computeMetricSwitch({ metric, interval, durationDays }) {
	let targetMetric = metric;
	let targetInterval = interval;

	if (metric === 'power' && durationDays >= 15) {
		targetMetric = 'energy';
		targetInterval = '1d';
	} else if (metric === 'energy' && durationDays <= 13) {
		targetMetric = 'power';
		targetInterval = '5m';
	}

	let displayInterval;
	if (metric === 'power') {
		displayInterval = durationDays < 2 ? '5m' : '30m';
	} else {
		displayInterval = durationDays >= 366 ? '1M' : '1d';
	}

	return {
		metric: targetMetric,
		interval: targetInterval,
		displayInterval,
		changed: targetMetric !== metric || targetInterval !== interval
	};
}
