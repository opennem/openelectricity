import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import { loadFuelTechs } from '$lib/fuel_techs.js';
import { fuelTechMap, orderMap, labelReducer } from './groups';

/**
 *
 * @param {{
 * history: StatsData[],
 * group: string,
 * unit: string,
 * colourReducer: *
 * targetInterval?: string
 * }} param0
 * @returns {{
 * stats: StatsInstance,
 * timeseries: TimeSeriesInstance}}
 */
function process({ history, group, unit, colourReducer, targetInterval }) {
	const fuelTechs = fuelTechMap[group];

	/********* processing */
	const stats = new Statistic(history, 'history', unit)
		.invertValues(loadFuelTechs)
		.group(fuelTechs, [], false)
		.reorder(orderMap[group] || []);

	const intervalString = targetInterval || stats.minIntervalObj?.intervalString || '1Y';

	const timeseries = new TimeSeries(
		stats.data,
		parseInterval(stats.minIntervalObj?.intervalString || '1Y'),
		'history',
		labelReducer[group],
		colourReducer
	)
		.transform()
		.rollup(parseInterval(intervalString))
		.updateMinMax();
	/********* end of processing */

	return {
		stats,
		timeseries
	};
}

export default process;
