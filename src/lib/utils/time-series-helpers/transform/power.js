import { interpolate } from 'd3-interpolate';
import { mean } from 'd3-array';
import { parseISO } from 'date-fns';
import { parse as parseInterval } from '../intervals';
import timeBucket from '../time-bucket';
import timeSeries from '../time-series';

/**
 * Transform backend json data to time series dataset and also additional meta data about the time series data
 * @param {StatsData[]} dataset
 * @param {DataRange} outputRange
 * @returns {TimeSeriesData[]|[]}
 */
export function transform(dataset, outputRange) {
	/** @type {StatsData[]} */
	const newDataset = [];
	const intervalArr = [...new Set(dataset.map((d) => d.history.interval))].map((i) =>
		parseInterval(i)
	);
	const minIntervalSeconds = Math.min(...intervalArr.map((i) => i.seconds));
	const minIntervalObj = intervalArr.find((i) => i.seconds === minIntervalSeconds);
	const otherDataset = dataset.find((d) => d.history.interval === minIntervalObj?.intervalString);

	/** @type {StatsData[]} */
	let interpolatedDatasets = [];

	// interpolate data to min interval
	dataset
		.filter((d) => d.history.interval !== minIntervalObj?.intervalString)
		.forEach((set) => {
			const newSet = { ...set };
			newSet.history = { ...set.history };

			if (set.forecast) {
				newSet.history.data = [...set.history.data, ...set.forecast.data];
				newSet.history.last = set.forecast.last;
			}
			const intervalObj = parseInterval(set.history.interval);

			newSet.history.data = interpolateData(
				newSet.history.data,
				intervalObj.incrementerValue,
				minIntervalObj?.incrementerValue
			);

			newSet.history.interval = minIntervalObj?.intervalString || '';

			delete newSet.forecast;

			interpolatedDatasets.push(newSet);
		});

	console.log('interpolatedDatasets', interpolatedDatasets);

	interpolatedDatasets.forEach((set) => {
		if (set.history) {
			const data = set.history.data;
			const seconds = minIntervalObj?.seconds || 0;
			const interval = seconds * 1000;
			const startTime = parseISO(set.history.start);

			const start = otherDataset?.history.start || '';
			const last = otherDataset?.history.last || '';
			const dataStartDate = parseISO(start);
			const dataLastDate = parseISO(last);

			const filteredData = data.filter((value, idx) => {
				const currentTime = new Date(startTime.getTime() + idx * interval);
				return currentTime >= dataStartDate && currentTime <= dataLastDate;
			});

			set.history.data = filteredData;
			set.history.start = start;
			set.history.last = last;
		}
	});

	[
		...dataset.filter((d) => d.history.interval === minIntervalObj?.intervalString),
		...interpolatedDatasets
	].forEach((set) => {
		const newSet = { ...set };
		newSet.history = { ...set.history };

		if (set.history.interval === '5m') {
			// convert to 30m
			newSet.history.interval = '30m';
			newSet.history.data = calculateMeanArray(set.history.data, 5, 30);
		}
		newDataset.push(newSet);
	});

	const intervals = [...new Set(dataset.map((d) => d.history.interval))];
	const starts = [...new Set(dataset.map((d) => d.history.start))];
	const lasts = [...new Set(dataset.map((d) => d.history.last))];
	const intervalObj = parseInterval(outputRange);
	const startDate = parseISO(starts[0]);
	const lastDate = parseISO(lasts[0]);

	console.log('intervals', intervals[1], intervalObj);
	console.log('starts', starts[0], startDate);
	console.log('lasts', lasts[0], lastDate);

	/** @type {TimeSeriesData[]} */
	const tsData = timeSeries({
		bucket: timeBucket({
			start: startDate,
			last: lastDate,
			incrementer: intervalObj.incrementerFn,
			incrementValue: intervalObj.incrementerValue
		}),
		dataset: newDataset,
		dataProp: 'history'
	});

	return tsData;
}

/**
 *
 * @param {StatsData[]} dataset
 * @param {DataRange} outputRange
 * @param {StatsType} statsType
 * @returns
 */
export function transformData(dataset, outputRange, statsType = 'history') {
	const starts = [...new Set(dataset.map((d) => d[statsType].start))];
	const lasts = [...new Set(dataset.map((d) => d[statsType].last))];
	const intervalObj = parseInterval(outputRange);
	const startDate = parseISO(starts[0]);
	const lastDate = parseISO(lasts[0]);

	/** @type {TimeSeriesData[]} */
	const tsData = timeSeries({
		bucket: timeBucket({
			start: startDate,
			last: lastDate,
			incrementer: intervalObj.incrementerFn,
			incrementValue: intervalObj.incrementerValue
		}),
		dataset,
		dataProp: statsType
	});

	return tsData;
}

/**
 * function to get mean value of a 5 minute interval to target interval in minutes
 * @param {number[]} dataArray
 * @param {number} original
 * @param {number} target
 * @returns {number[]}
 **/
export function calculateMeanArray(dataArray, original, target) {
	const meanArray = [];
	const ratio = target / original;
	for (let i = 0; i < dataArray.length; i += ratio) {
		const meanValue = mean(dataArray.slice(i, i + ratio));
		meanArray.push(meanValue);
	}
	return meanArray;
}

// function to interpolate data from 30 to 5 minute interval
export function interpolateData(dataArray, original, target) {
	const ratio = original / target;
	const interpolatedData = [];
	for (let i = 0; i < dataArray.length; i++) {
		if (i === dataArray.length - 1) {
			interpolatedData.push(dataArray[i]);
		} else {
			const interpolator = interpolate(dataArray[i], dataArray[i + 1]);
			for (let j = 0; j < ratio; j++) {
				interpolatedData.push(interpolator(j / ratio));
			}
		}
	}
	return interpolatedData;
}
