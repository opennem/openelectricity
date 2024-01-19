import { parse } from '../intervals';
import useDate from '../use-date';
import timeBucket from '../time-bucket';
import timeSeries from '../time-series';

/**
 * Transform backend json data to time series dataset and also additional meta data about the time series data
 * @param {StatsData[]} dataset
 * @param {string} dataProp
 * @param {DataRange} outputRange
 * @returns {TimeSeriesData[]|[]}
 */
export function transform(dataset, dataProp, outputRange) {
	const starts = [...new Set(dataset.map((d) => d[dataProp].start))];
	const lasts = [...new Set(dataset.map((d) => d[dataProp].last))];
	const intervalObj = parse(outputRange);
	const startDate = new Date(useDate(starts[0]));
	const lastDate = new Date(useDate(lasts[0]));

	return timeSeries({
		bucket: timeBucket({
			start: startDate,
			last: lastDate,
			incrementer: intervalObj.incrementerFn,
			incrementValue: intervalObj.incrementerValue
		}),
		dataset,
		dataProp
	});
}
