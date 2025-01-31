/**
 * @param {{datapoint: TimeSeriesData, domains: string[]}} params
 * @returns
 */
export default function proportion({ datapoint, domains }) {
	let total = 0;
	let updated = {
		...datapoint
	};

	domains.forEach((e) => {
		let value = /** @type {number} **/ (datapoint[e]);
		total += value > 0 ? value : 0;
	});

	domains.forEach((e) => {
		let value = /** @type {number} **/ (datapoint[e]);
		updated[e] = value > 0 ? (value / total) * 100 : 0;
	});

	return updated;
}
