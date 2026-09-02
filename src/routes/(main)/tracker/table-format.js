import { formatGenerationUnitValue } from '$lib/components/charts/network/generation-units.js';
import { formatSI } from '$lib/utils/si-units.js';

/**
 * Format a native MW table aggregate in the selected display prefix. Values
 * strictly inside (-10, 10) retain one decimal; all others render whole.
 *
 * @param {number | null | undefined} valueMW
 * @param {SiPrefix} displayPrefix
 * @returns {string}
 */
export function formatTablePower(valueMW, displayPrefix) {
	return formatGenerationUnitValue(valueMW, 'M', displayPrefix);
}

/**
 * Format a Tracker percentage value without its unit. Tooltips append their
 * unit separately; table cells use the wrapper below.
 *
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatTrackerPercentageValue(value) {
	if (value == null || !Number.isFinite(value)) return '—';
	return formatSI(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Format a table percentage with exactly one decimal place.
 *
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatTablePercentage(value) {
	const formatted = formatTrackerPercentageValue(value);
	return formatted === '—' ? formatted : `${formatted}%`;
}
