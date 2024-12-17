import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';

/**
 *
 * @param {{
 * history: StatsData[],
 * unit: string,
 * colourReducer: *
 * targetInterval?: string,
 * calculate12MthRollingSum: boolean,
 * }} param0
 * @returns {{
 * stats: StatsInstance,
 * timeseries: TimeSeriesInstance}}
 */
function process({ history, unit, colourReducer, targetInterval, calculate12MthRollingSum }) {
	/********* processing */
	const stats = new Statistic(history, 'history', unit).group({ demand: ['demand'] }, [], true);

	targetInterval = targetInterval || stats.minIntervalObj?.intervalString || '1Y';

	const timeseriesInstance = new TimeSeries(
		stats.data,
		parseInterval(stats.minIntervalObj?.intervalString || '1Y'),
		'history',
		() => 'Demand',
		() => 'red'
	)
		.transform()
		.rollup(parseInterval(targetInterval));

	const timeseries = calculate12MthRollingSum
		? timeseriesInstance.calculate12MthRollingSum().updateMinMax()
		: timeseriesInstance.updateMinMax();
	/********* end of processing Projection */

	console.log('stats', stats);
	console.log('timeseries', timeseries);

	return {
		stats,
		timeseries
	};
}

export default process;
