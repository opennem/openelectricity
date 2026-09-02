import { convert, formatSI } from '$lib/utils/si-units.js';

const AUTO_TWH_THRESHOLD_MWH = 100_000;

/**
 * Format a generation quantity after conversion to its displayed SI prefix.
 * Values strictly inside (-10, 10) retain one decimal; all others render
 * whole. Used by Tracker table and tooltip values so their precision matches.
 *
 * @param {number | null | undefined} value
 * @param {SiPrefix} fromPrefix
 * @param {SiPrefix} displayPrefix
 * @returns {string}
 */
export function formatGenerationUnitValue(value, fromPrefix, displayPrefix) {
	if (value == null) return '—';
	const displayedValue = convert(fromPrefix, displayPrefix, value);
	if (!Number.isFinite(displayedValue)) return '—';
	const fractionDigits = Math.abs(displayedValue) < 10 ? 1 : 0;
	return formatSI(value, {
		fromPrefix,
		toPrefix: displayPrefix,
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits
	});
}

/**
 * Choose the initial energy unit from the largest positive generation stack.
 * The first six-digit MWh value is promoted directly to TWh; GWh remains
 * available as a manual chart option.
 *
 * @param {any[]} rows
 * @param {string[]} seriesNames
 * @returns {SiPrefix}
 */
export function automaticGenerationEnergyPrefix(rows, seriesNames) {
	let maximumMWh = 0;
	for (const row of rows) {
		let totalMWh = 0;
		for (const name of seriesNames) {
			const value = row[name];
			if (Number.isFinite(value) && value > 0) totalMWh += value;
		}
		if (totalMWh > maximumMWh) maximumMWh = totalMWh;
	}
	return maximumMWh >= AUTO_TWH_THRESHOLD_MWH ? 'T' : 'M';
}

/**
 * Smaller display units are whole-number quantities; GW/GWh/TWh need enough
 * precision to avoid turning a valid converted value into zero.
 *
 * @param {SiPrefix} prefix
 */
export function generationUnitMaximumFractionDigits(prefix) {
	return prefix === 'M' ? 0 : 2;
}
