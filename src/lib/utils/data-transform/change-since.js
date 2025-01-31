/**
 * @param {{datapoint: TimeSeriesData, dataset: TimeSeriesData[], domains: string[]}} params
 * @returns
 */
export default function changeSince({ datapoint, dataset, domains }) {
	if (dataset.length === 0) return datapoint;

	let changeCompare = dataset[0];
	let updated = {
		...datapoint
	};

	domains.forEach((e) => {
		let value = /** @type {number} **/ (datapoint[e]);
		let compareValue = /** @type {number} **/ (changeCompare[e] || 0);
		updated[e] = value - compareValue;
	});

	return updated;
}
