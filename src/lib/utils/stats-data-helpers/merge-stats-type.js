import deepCopy from '$lib/utils/deep-copy';

/**
 * Merge forecast and other stats type data to make it easy to calculate dataset
 * - atm, we only have forecast and history to merge
 * @param {StatsData[]} originalData
 * @param {StatsType} statsType
 */
export default function (originalData, statsType = 'history') {
	/** @type {StatsData[]} */
	const data = deepCopy(originalData);

	if (statsType !== 'forecast') {
		data.forEach((d) => {
			if (d.forecast) {
				d[statsType].data = [...d[statsType].data, ...d.forecast.data];
				d[statsType].last = d.forecast.last;
			}
		});
	}

	return data;
}
