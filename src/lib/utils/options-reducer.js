/**
 * @param {*[]} options
 * @param {string} prop
 * @param {string} value
 */
export default function (options, prop = 'value', value = 'label') {
	return options.reduce((acc, curr) => ((acc[curr[prop]] = curr[value]), acc), {});
}
