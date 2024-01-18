/** @typedef {import('$lib/types/chart.types').TimeSeriesData} TimeSeriesData */

/**
 * @param {TimeSeriesData[]} dataset
 * @param {string[]} seriesNames
 * @param {string[]} loadSeries
 * @returns {TimeSeriesData[]}
 */
export default function (dataset, seriesNames, loadSeries) {
	return dataset.map((d) => {
		/** @type {TimeSeriesData} */
		const newObj = { ...d };
		// get min and max values for each time series
		newObj._max = 0;
		newObj._min = 0;
		seriesNames.forEach((l) => {
			const value = d[l] || 0;
			if (newObj._max || newObj._max === 0) newObj._max += +value;
		});
		loadSeries.forEach((l) => {
			const value = d[l] || 0;
			if (newObj._min || newObj._min === 0) newObj._min += +value;
		});

		return newObj;
	});
}
