import getMonthKey from '$lib/utils/TimeSeries/rollup/month';
import getYearKey from '$lib/utils/TimeSeries/rollup/year';
import getMinutesKey from '$lib/utils/TimeSeries/rollup/minutes';
import getYearFinKey from '$lib/utils/TimeSeries/rollup/year-fin';

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
