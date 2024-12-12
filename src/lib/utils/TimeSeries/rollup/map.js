import getMonthKey from '$lib/utils/TimeSeries/rollup/month';
import getQuarterKey from '$lib/utils/TimeSeries/rollup/quarter';
import getYearHalfKey from '$lib/utils/TimeSeries/rollup/year-half';
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
			return (/** @type {number} */ time) => getMinutesKey(time, 5 * 6 * 1000);

		case '30m':
			return (/** @type {number} */ time) => getMinutesKey(time, 30 * 60 * 1000);

		case '1M':
			return getMonthKey;

		case '1Q':
			return getQuarterKey;

		case '6M':
			return getYearHalfKey;

		case 'FY':
			return getYearFinKey;

		case '1Y':
			return getYearKey;

		default:
			return (/** @type {number} */ time) => getMinutesKey(time, 5 * 6 * 1000);
	}
}
