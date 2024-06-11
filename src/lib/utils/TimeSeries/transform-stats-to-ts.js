import { parseISO } from 'date-fns';
import useDate from './use-date';
import parseInterval from '../intervals';
import timeBucket from './time-bucket';
import timeSeries from './time-series';
/**
 *
 * @param {StatsData[]} dataset
 * @param {DataRange | StatsInterval} outputRange
 * @param {StatsType} statsType
 * @returns {TimeSeriesData[]}
 */
export default function (dataset, outputRange, statsType = 'history') {
	const starts = [...new Set(dataset.map((d) => d[statsType]?.start))];
	const lasts = [...new Set(dataset.map((d) => d[statsType]?.last))];
	const intervalObj = typeof outputRange === 'string' ? parseInterval(outputRange) : outputRange;
	const isLessThanDay = intervalObj.seconds < 86400;
	const startDate = isLessThanDay ? parseISO(starts[0]) : new Date(useDate(starts[0]));
	const lastDate = isLessThanDay ? parseISO(lasts[0]) : new Date(useDate(lasts[0]));

	/** @type {TimeSeriesData[]} */
	const tsData = timeSeries({
		bucket: timeBucket({
			start: intervalObj.startOfFn(startDate),
			last: intervalObj.startOfFn(lastDate),
			incrementer: intervalObj.incrementerFn,
			incrementValue: intervalObj.incrementerValue
		}),
		dataset,
		dataProp: statsType
	});

	return tsData;
}
