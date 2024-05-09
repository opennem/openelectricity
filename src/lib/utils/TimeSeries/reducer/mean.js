import { mean } from 'd3-array';

/**
 * @param {TimeSeriesData[]} values
 * @param {string[]} domains
 */
export default function (values, domains) {
	const key = /** @type {number} */ (values[0].key);

	/** @type {TimeSeriesData} */
	const obj = {
		time: key,
		date: new Date(key)
	};

	domains.forEach((domain) => {
		obj[domain] = mean(
			values,
			(/** @type {TimeSeriesData} */ d) => /** @type {number} **/ (d[domain])
		);
	});

	return obj;
}
