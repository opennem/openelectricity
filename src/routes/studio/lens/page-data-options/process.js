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
 * }} param0
 * @returns {{
 * stats: StatsInstance,
 * timeseries: TimeSeriesInstance}}
 */
function process({ history, unit, colourReducer }) {
	const group = 'detailed';
	const fuelTechs = fuelTechMap[group];
	console.log('history', history);

	/********* processing */
	const stats = new Statistic(history, 'history', unit)
		.group(fuelTechs, [], true)
		.reorder(orderMap[group] || []);

	const timeseries = new TimeSeries(
		stats.data,
		parseInterval(stats.minIntervalObj?.intervalString || '1Y'),
		'history',
		labelReducer[group],
		colourReducer
	)
		.transform()
		.updateMinMax();
	/********* end of processing Projection */

	console.log('timeseries', timeseries);

	return {
		stats,
		timeseries
	};
}

export default process;
