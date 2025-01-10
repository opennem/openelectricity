/**
 * @param {{datapoint: TimeSeriesData, dataset: TimeSeriesData[], domains: string[]}} params
 * @returns
 */
export default function changeSince({ datapoint, dataset, domains }) {
	if (dataset.length === 0) return datapoint;

	const changeCompare = dataset[0];
	const updated = {
		...datapoint
	};

	domains.forEach((e) => {
		const value = /** @type {number} **/ (datapoint[e]);
		const compareValue = /** @type {number} **/ (changeCompare[e] || 0);
		updated[e] = value - compareValue;
	});

	return updated;
}
