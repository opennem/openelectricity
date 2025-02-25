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
	calculate12MthRollingSum
}) {
	/********* processing */
	const stats = new Statistic(history, 'history', unit)
		.group(fuelTechMap, [], false)
		.reorder(fuelTechOrder);

	let intervalString = targetInterval || stats.minIntervalObj?.intervalString || '1Y';

	const timeseriesInstance = new TimeSeries(
		stats.data,
		parseInterval(intervalString),
		'history',
		labelReducer,
		colourReducer
	)
		.transform()
		.rollup(parseInterval(intervalString));

	const timeseries = calculate12MthRollingSum
		? timeseriesInstance.calculate12MthRollingSum().updateMinMax()
		: timeseriesInstance.updateMinMax();
	/********* end of processing Projection */

	return {
		stats,
		timeseries
	};
}

export default process;
