import { parse as parseInterval } from './intervals';
import useDate from './use-date';

/**
 * Transform backend json data to time series dataset and also additional meta data about the time series data
 * @param {*} dataset
 * @returns {[{time: number, date: Date, [key: string]: number}]|[]}
 */
export function transformToTimeSeriesDataset(dataset) {
	console.log('before', dataset);

	// get all the projection data unique interval, start and last
	// - expect all should be the same
	const intervals = [...new Set(dataset.map((d) => d.projection.interval))];
	const starts = [...new Set(dataset.map((d) => d.projection.start))];
	const lasts = [...new Set(dataset.map((d) => d.projection.last))];

	// console.log('intervals', intervals);
	// console.log('starts', starts);
	// console.log('lasts', lasts);

	if (intervals.length && starts.length && lasts.length) {
		// TODO: throw a warning if there is more than one
		const interval = intervals[0];
		const start = starts[0];
		const last = lasts[0];
		const intervalObj = parseInterval(interval);
		const startDate = new Date(useDate(start));
		const lastDate = new Date(useDate(last));

		console.log('interval', interval);
		console.log('start', start);
		console.log('startDate', startDate);
		console.log('last', last);
		console.log('lastDate', lastDate);
		console.log('intervalObj', intervalObj);

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
					.incrementerFn(currentTime, intervalObj.incrementerValue)
					.getTime();
			}
		}

		// add projection data
		dataset.forEach((ds) => {
			const id = ds.id;
			const data = ds.projection.data;

			// TODO: throw a warning if length doesn't match
			console.log('check length', tsData.length, data.length);

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

		console.log('tsData', tsData);

		return tsData;
	}

	return [];
}
