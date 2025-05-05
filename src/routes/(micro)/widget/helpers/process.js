import { loadFuelTechs } from '$lib/fuel_techs';
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
 * calculate12MthRollingSum?: boolean,
 * fuelTechMap: { [key: string]: string[] },
 * fuelTechOrder: string[],
 * labelReducer: *
 * }} param0
 * @returns {{
 * stats: StatsInstance,
 * timeseries: TimeSeriesInstance}}
 */
function process({
	history,
	fuelTechMap,
	fuelTechOrder,
	unit,
	colourReducer,
	labelReducer,
	targetInterval,
	calculate12MthRollingSum = false
}) {
	console.log('history', history);
	let historyWithoutLoad = history.filter((d) => !loadFuelTechs.includes(d.fuel_tech || ''));
	console.log('historyWithoutLoad', historyWithoutLoad);

	/********* processing */
	const stats = new Statistic(historyWithoutLoad, 'history', unit)
		.invertValues(loadFuelTechs)
		.group(fuelTechMap, loadFuelTechs, false)
		.reorder(fuelTechOrder);

	let intervalString = targetInterval || stats.minIntervalObj?.intervalString || '1Y';
	// let loadSeries = stats.data.filter((d) => d.isLoad).map((d) => d.id);

	const timeseriesInstance = new TimeSeries(
		stats.data,
		parseInterval('5m'),
		'history',
		labelReducer,
		colourReducer
	)
		.transform()
		.rollup(parseInterval(intervalString), 'mean');

	const timeseries = timeseriesInstance.updateMinMax();
	/********* end of processing Projection */

	return {
		stats,
		timeseries
	};
}

export default process;
