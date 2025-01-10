/**
 * @param {TimeSeriesData} d
 * @param {string[]} domains
 * @returns
 */
export default function proportion(d, domains) {
	let total = 0;
	let updated = {
		...d
	};

	domains.forEach((e) => {
		const value = /** @type {number} **/ (d[e]);
		total += value > 0 ? value : 0;
	});

	domains.forEach((e) => {
		const value = /** @type {number} **/ (d[e]);
		updated[e] = value > 0 ? (value / total) * 100 : 0;
	});

	return updated;
}
