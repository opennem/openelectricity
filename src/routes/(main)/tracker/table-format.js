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
 * becomes 10 GWh, 10,000 GWh becomes 10 TWh — rather than following the
 * chart's early promotion to TWh, so GWh is always visited first.
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
 * Format a window emissions total in plain tonnes (tCO₂e) — never scaled to
 * kt/Mt, so rows read directly against the chart's tonnes — with the same
 * precision rule as power: one decimal strictly inside (-10, 10).
 *
 * @param {number | null | undefined} valueT
 * @returns {string}
 */
export function formatTableEmissions(valueT) {
	return formatGenerationUnitValue(valueT, '', '');
}

/**
 * Format an emissions intensity (kgCO₂e/MWh) — one decimal below 10, whole
 * numbers otherwise.
 *
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatTableIntensity(value) {
	return formatGenerationUnitValue(value, '', '');
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
