import deepCopy from '$lib/utils/deep-copy';

/**
 * Merge forecast and other stats type data to make it easy to calculate dataset
 * - atm, we only have forecast and history to merge
 * @param {StatsData[]} originalData
 * @param {StatsType} statsType
 */
export default function (originalData, statsType = 'history') {
	const statsObj = (/** @type {any} */ d) => d[statsType] || d.history;

	/** @type {StatsData[]} */
	const data = deepCopy(originalData);

	if (statsType !== 'forecast') {
		data.forEach((d) => {
			if (d.forecast) {
				statsObj(d).data = [...statsObj(d).data, ...d.forecast.data];
				statsObj(d).last = d.forecast.last;
			}
		});
	}

	return data;
}
