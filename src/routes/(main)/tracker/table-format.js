/**
 * Cell formatters for the tracker's fuel-tech table. Missing values render as
 * an em dash — a group can lack a value legitimately (no market settlement,
 * zero energy, or an inapplicable contribution mode).
 */

import { formatGenerationUnitValue } from '$lib/components/charts/network/generation-units.js';
import { formatPrice } from '$lib/utils/formatters';
import { formatSI } from '$lib/utils/si-units.js';

export const EMPTY_CELL = '—';

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
 * Format a window energy total (MWh) in the selected display prefix, with the
 * same precision rule as power.
 *
 * @param {number | null | undefined} valueMWh
 * @param {SiPrefix} displayPrefix
 * @returns {string}
 */
export function formatTableEnergy(valueMWh, displayPrefix) {
	return formatGenerationUnitValue(valueMWh, 'M', displayPrefix);
}

/**
 * The prefix the Energy column renders in, chosen from its largest value. The
 * column steps up only once a value would need five digits — 10,000 MWh
 * becomes 10 GWh, 10,000 GWh becomes 10 TWh. This table-specific scaling is
 * independent of the chart's automatic GWh default and manual unit choice.
 *
 * @param {number} maxMWh
 * @returns {SiPrefix}
 */
export function energyDisplayPrefix(maxMWh) {
	if (maxMWh >= 10_000_000) return 'T';
	if (maxMWh >= 10_000) return 'G';
	return 'M';
}

/**
 * Format a Tracker percentage value without its unit. Tooltips append their
 * unit separately; table cells use the wrapper below.
 *
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatTrackerPercentageValue(value) {
	if (value == null || !Number.isFinite(value)) return EMPTY_CELL;
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
	return formatted === EMPTY_CELL ? formatted : `${formatted}%`;
}

/**
 * Format a volume-weighted price ($/MWh), cents always shown.
 *
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatTablePrice(value) {
	if (value == null || !Number.isFinite(value)) return EMPTY_CELL;
	return formatPrice(value);
}

/**
 * Format a window emissions total (tonnes) in the selected display prefix —
 * plain tonnes by default, so rows read directly against the chart — with the
 * same precision rule as power: one decimal strictly inside (-10, 10).
 *
 * @param {number | null | undefined} valueT
 * @param {SiPrefix} [displayPrefix] - '' t, 'k' kt, 'M' Mt
 * @returns {string}
 */
export function formatTableEmissions(valueT, displayPrefix = '') {
	return formatGenerationUnitValue(valueT, '', displayPrefix);
}

/**
 * Format an emissions intensity given in kgCO₂e/MWh. In kg it keeps one
 * decimal below 10 and whole numbers otherwise; in tonnes ('M', i.e. Mg)
 * values sit around 1, so it always shows two decimals.
 *
 * @param {number | null | undefined} valueKg
 * @param {SiPrefix} [displayPrefix] - 'k' kgCO₂e/MWh, 'M' tCO₂e/MWh
 * @returns {string}
 */
export function formatTableIntensity(valueKg, displayPrefix = 'k') {
	if (displayPrefix === 'k') return formatGenerationUnitValue(valueKg, 'k', 'k');
	if (valueKg == null || !Number.isFinite(valueKg)) return EMPTY_CELL;
	return formatSI(valueKg, {
		fromPrefix: 'k',
		toPrefix: displayPrefix,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

/**
 * Split a series label into its name and parenthesised qualifier — "Battery
 * (Charging)" renders the qualifier in a muted tone.
 *
 * @param {string} label
 * @returns {{ main: string, sub: string }}
 */
export function splitTableLabel(label) {
	const index = label.indexOf(' (');
	if (index === -1) return { main: label, sub: '' };
	return { main: label.slice(0, index), sub: label.slice(index + 1) };
}
