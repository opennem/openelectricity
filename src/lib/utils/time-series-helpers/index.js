/**
 * Transform backend json data to time series dataset and additional meta data about the time series data
 * @param {*} dataset
 * @returns {*}
 */
export function transformToTimeSeriesDataset(dataset) {
	console.log(dataset);

	// get all the projection data unique interval, start and last
	// - expect all should be the same
	const intervals = [...new Set(dataset.map((d) => d.projection.interval))];
	const starts = [...new Set(dataset.map((d) => d.projection.start))];
	const lasts = [...new Set(dataset.map((d) => d.projection.last))];

	// console.log('intervals', intervals);
	// console.log('starts', starts);
	// console.log('lasts', lasts);

	if (intervals.length && starts.length && lasts.length) {
		const interval = intervals[0];
		const start = starts[0];
		const last = lasts[0];

		console.log('interval', interval);
		console.log('start', start);
		console.log('last', last);

		return {
			tsData: [],
			start: new Date(start),
			last: new Date(last),
			interval
		};
	}

	return null;
}
