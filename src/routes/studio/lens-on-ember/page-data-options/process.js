import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import { fuelTechMap, orderMap, labelReducer } from './groups';

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
	const group = 'detailed';
	const fuelTechs = fuelTechMap[group];

	/********* processing */
	const stats = new Statistic(history, 'history', unit)
		.group(fuelTechs, [], true)
		.reorder(orderMap[group] || []);

	targetInterval = targetInterval || stats.minIntervalObj?.intervalString || '1Y';

	const timeseriesInstance = new TimeSeries(
		stats.data,
		parseInterval(stats.minIntervalObj?.intervalString || '1Y'),
		'history',
		labelReducer[group],
		colourReducer
	)
		.transform()
		.rollup(parseInterval(targetInterval));

	const timeseries = calculate12MthRollingSum
		? timeseriesInstance.calculate12MthRollingSum().updateMinMax()
		: timeseriesInstance.updateMinMax();
	/********* end of processing Projection */

	console.log('timeseries', timeseries);

	return {
		stats,
		timeseries
	};
}

export default process;
