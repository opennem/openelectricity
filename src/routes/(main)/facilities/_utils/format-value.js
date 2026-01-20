import { getNumberFormat } from '$lib/utils/formatters';

const formatter0 = getNumberFormat(0);
const formatter1 = getNumberFormat(1);

/**
 * Format a number with conditional decimal places
 * Values < 10 get 1 decimal place, otherwise 0
 * @param {number} value
 * @returns {string}
 */
export default function formatValue(value) {
	if (value < 10) {
		return formatter1.format(value);
	}
	return formatter0.format(value);
}
