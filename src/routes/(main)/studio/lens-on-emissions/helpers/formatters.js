/**
 * Formatters for emissions data display
 *
 * Provides reusable formatting functions for emissions values,
 * percentages, and related calculations.
 */

/**
 * Format an emissions value with commas
 * @param {number} value - The value to format
 * @param {number} [decimals=0] - Number of decimal places (default: 0)
 * @returns {string} Formatted value string
 */
export function formatEmissionsValue(value, decimals = 0) {
	return Math.abs(value).toLocaleString('en-AU', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	});
}

/**
 * Format a percentage value
 * @param {number} percentage - The percentage to format
 * @returns {string} Formatted percentage string with % suffix
 */
export function formatPercentage(percentage) {
	return Math.round(percentage) + '%';
}

/**
 * Calculate percentage contribution of a value relative to a total
 * @param {number} value - The value to calculate percentage for
 * @param {number} total - The total to calculate against
 * @returns {number} Percentage (0-100)
 */
export function calculatePercentage(value, total) {
	if (total === 0) return 0;
	return (Math.abs(value) / total) * 100;
}

/**
 * Calculate the total of absolute values for given sectors
 * @param {Record<string, number> | null} data - Data object with sector values
 * @param {string[]} sectors - Array of sector keys
 * @returns {number} Sum of absolute values
 */
export function calculateTotalAbsolute(data, sectors) {
	if (!data) return 0;
	return sectors.reduce((sum, sector) => {
		const value = data[sector] ?? 0;
		return sum + Math.abs(value);
	}, 0);
}

/**
 * Calculate the net total (sum including negative values) for given sectors
 * @param {Record<string, number> | null} data - Data object with sector values
 * @param {string[]} sectors - Array of sector keys
 * @returns {number} Net sum of all values
 */
export function calculateNetTotal(data, sectors) {
	if (!data) return 0;
	return sectors.reduce((sum, sector) => {
		return sum + (data[sector] ?? 0);
	}, 0);
}

/**
 * Format a value with sign prefix for display
 * @param {number} value - The value to format
 * @param {number} [decimals=0] - Number of decimal places
 * @returns {string} Formatted value with '-' prefix if negative
 */
export function formatSignedValue(value, decimals = 0) {
	const prefix = value < 0 ? '-' : '';
	return prefix + formatEmissionsValue(value, decimals);
}
