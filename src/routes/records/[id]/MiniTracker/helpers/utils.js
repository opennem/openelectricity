/**
 * @param {TimeSeriesData[]} data
 * @param {number} focusTime
 * @param {number} [pointCount]
 * @returns {TimeSeriesData[]}
 */
export function filterData(data, focusTime, pointCount = 10) {
	let focusIndex = data.findIndex((d) => d.time === focusTime);
	let startIndex = Math.max(0, focusIndex - pointCount);
	let endIndex = Math.min(data.length - 1, focusIndex + pointCount);
	return data.slice(startIndex, endIndex);
}

/**
 *
 * @param {*} record
 * @returns
 */
export function getDataPath(record) {
	let { network_id, network_region, metric, interval, period } = record;
	let isPeriodDay = period === 'day';
	// get first 4 characters of interval
	let year = interval.slice(0, 4);
	let yearParam = isPeriodDay ? `&year=${year}` : '';
	let regionParam = network_region ? `&region=${network_region}` : '';

	// API currently only supports type energy and power.
	//  - Fetch those first and the other metrics that are inside the dataset
	//  - TODO: also use Period to check which api type to call
	//  - note emissions and price is inside the dataset
	let typeParam = metric && (metric === 'power' || metric === 'energy') ? `&type=${metric}` : '';
	let dataPath = `network=${network_id}${typeParam}${regionParam}${yearParam}`;

	return dataPath;
}
