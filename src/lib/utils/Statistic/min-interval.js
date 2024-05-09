import parseInterval from '$lib/utils/intervals';

/**
 *
 * @param {StatsData[]} data
 * @param {StatsType} statsType
 * @returns {StatsInterval}
 */
export default function (data, statsType = 'history') {
	// Find out if there are multiple intervals in the dataset
	const intervalArr = [...new Set(data.map((d) => d[statsType].interval))].map((i) =>
		parseInterval(i)
	);

	// Get the smallest interval data
	const minIntervalObj = intervalArr.find(
		(i) => i.seconds === Math.min(...intervalArr.map((i) => i.seconds))
	);

	if (!minIntervalObj) console.error('No minIntervalObj found', intervalArr);

	return /** @type {StatsInterval} */ (minIntervalObj);
}
