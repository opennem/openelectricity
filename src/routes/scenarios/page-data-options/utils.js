import { startOfYear, addYears } from 'date-fns';

/**
 * Merge historical emissions data into total
 * @param {StatsData[]} historyData
 * @param {boolean} includeBatteryAndLoads
 * @returns {StatsData[]}
 */
export function mergeHistoricalEmissionsData(historyData, includeBatteryAndLoads) {
	const firstData = historyData[0];
	const combinedHistoryData = {
		...firstData,
		id: 'au.emissions.total',
		code: 'none',
		fuel_tech: null,
		history: {
			...firstData.history,
			data: [...firstData.history.data.map(() => 0)]
		}
	};

	historyData.forEach((d) => {
		const isExports = d.fuel_tech === 'exports';
		d.history.data.forEach((v, j) => {
			const newValue = includeBatteryAndLoads ? (isExports ? -v : v) : isExports ? 0 : v;
			combinedHistoryData.history.data[j] += newValue || 0;
		});
	});
	return [combinedHistoryData];
}

// Convert historical data to Terra to match ISP
export function covertHistoryDataToTWh(data) {
	return data.map((/** @type {StatsData} */ d) => {
		const historyData = d.history.data.map((v) => (v ? v / 1000 : null));
		d.history = { ...d.history, data: historyData };
		d.units = 'TWh';
		return d;
	});
}

/**
 * @param {TimeSeriesData[]} data
 * @param {number} additionalYears
 */
export function mutateDatesToStartOfYear(data, additionalYears = 0) {
	return data.map((d) => {
		const date = startOfYear(addYears(d.date, additionalYears));
		return { ...d, date, time: date.getTime() };
	});
}
