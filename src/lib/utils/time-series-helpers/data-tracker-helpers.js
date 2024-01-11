import { interpolate } from 'd3-interpolate';
import { mean } from 'd3-array';
import { parseISO } from 'date-fns';
import { parse as parseInterval } from './intervals';
import useDate from './use-date';
import { data } from 'autoprefixer';

/**
 * Transform backend json data to time series dataset and also additional meta data about the time series data
 * @param {import('$lib/types/stats.types').StatsData[]} dataset
 * @returns {import('$lib/types/chart.types').TimeSeriesData[]|[]}
 */
export function transformToTimeSeriesDataset(dataset) {
	const newDataset = [];

	dataset.forEach((set) => {
		const newSet = { ...set };
		newSet.history = { ...set.history };

		if (set.history.interval === '5m') {
			// convert to 30m
			newSet.history.interval = '30m';
			newSet.history.data = calculateMeanArray(set.history.data, 5, 30);
		} else {
			newSet.history.data = [...set.history.data];
		}
		newDataset.push(newSet);
	});

	// get all the projection data unique interval, start and last
	// - expect all should be the same
	const intervals = [...new Set(dataset.map((d) => d.history.interval))];
	const starts = [...new Set(dataset.map((d) => d.history.start))];
	const lasts = [...new Set(dataset.map((d) => d.history.last))];
	const intervalObj = parseInterval('30m');
	const startDate = parseISO(starts[0]);
	const lastDate = parseISO(lasts[0]);

	console.log('intervals', intervals[1], intervalObj);
	console.log('starts', starts[0], startDate);
	console.log('lasts', lasts[0], lastDate);

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
