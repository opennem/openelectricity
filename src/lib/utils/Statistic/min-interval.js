import parseInterval from '$lib/utils/intervals';

/**
 *
 * @param {StatsData[]} data
 * @param {StatsType} statsType
 * @returns {StatsInterval | undefined}
 */
export default function (data, statsType = 'history') {
	const statsObj = (d) => d[statsType] || d.history;

	// Find out if there are multiple intervals in the dataset
	const intervalArr = [...new Set(data.map((d) => statsObj(d).interval))].map((i) =>
		parseInterval(i)
	);

	// Get the smallest interval data
	const minIntervalObj = intervalArr.find(
		(i) => i.seconds === Math.min(...intervalArr.map((i) => i.seconds))
	);

	// if (!minIntervalObj) console.warn('No minIntervalObj found', intervalArr);

	return /** @type {StatsInterval} */ (minIntervalObj);
}
