import getMonthKey from '$lib/utils/time-series-helpers/rollup/month';
import getYearKey from '$lib/utils/time-series-helpers/rollup/year';
import getMinutesKey from '$lib/utils/time-series-helpers/rollup/minutes';
import getYearFinKey from '$lib/utils/time-series-helpers/rollup/year-fin';

/**
 *
 * @param {StatsInterval} statsInterval
 * @returns
 */
export default function (statsInterval) {
	switch (statsInterval.intervalString) {
		case '5m':
		case '30m':
			return (/** @type {number} */ time) => getMinutesKey(time, statsInterval.milliseconds);

		case '1M':
			return getMonthKey;

		case 'FY':
			return getYearFinKey;

		case '1Y':
			return getYearKey;

		default:
			return (/** @type {number} */ time) => getMinutesKey(time, statsInterval.milliseconds);
	}
}
