import { interpolate } from 'd3-interpolate';
import { mean } from 'd3-array';
import { parseISO } from 'date-fns';
// import { formatInTimeZone } from 'date-fns-tz';
import { parse as parseInterval } from './intervals';
import mutateWithMinMax from './mutate-with-min-max';

/**
 * Transform backend json data to time series dataset and also additional meta data about the time series data
 * @param {import('$lib/types/stats.types').StatsData[]} dataset
 * @returns {import('$lib/types/chart.types').TimeSeriesData[]|[]}
 */
export function transformToTimeSeriesDataset(dataset) {
	const newDataset = [];

	console.log('dataset', dataset);

	// process solar rooftop
	// merge history/forecast data and update start last
	// convert 30m to 5m for Rooftop solar

	const intervalArr = [...new Set(dataset.map((d) => d.history.interval))].map((i) =>
		parseInterval(i)
	);
	const minIntervalSeconds = Math.min(...intervalArr.map((i) => i.seconds));
	const minIntervalObj = intervalArr.find((i) => i.seconds === minIntervalSeconds);

	const otherDataset = dataset.find((d) => d.history.interval === minIntervalObj?.intervalString);
	console.log('intervalArr', intervalArr, minIntervalSeconds);

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
		const data = set.history.data;
		const interval = minIntervalObj?.seconds * 1000;
		const startTime = new Date(set.history.start);
		// Calculate end time based on the length of the data and interval
		const endTime = new Date(startTime.getTime() + data.length * interval);

		const start = otherDataset?.history.start;
		const last = otherDataset?.history.last;
		// Define your desired start and end date
		const desiredStartDate = new Date(start);
		const desiredEndDate = new Date(last);

		// Filter data based on the desired date range
		const filteredData = data.filter((value, idx) => {
			const currentTime = new Date(startTime.getTime() + idx * interval);
			return currentTime >= desiredStartDate && currentTime <= desiredEndDate;
		});

		set.history.data = filteredData;
		set.history.start = start;
		set.history.last = last;
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
	const intervalObj = parseInterval('30m');
	const startDate = parseISO(starts[0]);
	const lastDate = parseISO(lasts[0]);

	console.log('intervals', intervals[1], intervalObj);
	console.log('starts', starts[0], startDate);
	console.log('lasts', lasts[0], lastDate);
	// console.log('format', startDate, formatInTimeZone(startDate, '+10:00', 'yyyy-MM-dd HH:mm:ss'));

	let currentTime = startDate.getTime();
	let lastTime = lastDate.getTime();

	/** @type {*} */
	const tsData = [];

	// time bucket
	while (currentTime <= lastTime) {
		if (intervalObj.incrementerFn) {
			tsData.push({
				time: currentTime,
				date: new Date(currentTime)
			});
			currentTime = intervalObj
				// @ts-ignore
				.incrementerFn(currentTime, intervalObj.incrementerValue)
				.getTime();
		}
	}

	// add history data
	newDataset.forEach((ds) => {
		const id = ds.id;
		const data = ds.history.data;

		// TODO: throw a warning if length doesn't match
		// console.log('check length', tsData.length, data.length);

		data.forEach(
			/**
			 *
			 * @param {*} d
			 * @param {number} i
			 */
			(d, i) => {
				tsData[i][id] = d;
			}
		);
	});

	console.log('tsData', tsData, newDataset);

	// const loads = ['pumps', 'battery_charging', 'exports'];
	// const loadSeries = newDataset.filter((d) => loads.includes(d.fuel_tech)).map((d) => d.id);

	return tsData;
}

/**
 * function to get mean value of a 5 minute interval to target interval in minutes
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
