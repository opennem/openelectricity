/**
 * Cell formatting shared by chart cards and their tables: the em dash for a
 * missing value, one-decimal percentages and a series label split from its
 * parenthesised qualifier. Pure module.
 */

import { formatSI } from '$lib/utils/si-units.js';

/** A missing value — never a fabricated zero. */
export const EMPTY_CELL = '—';

/**
 * A percentage to one decimal place, without its unit (`42.0`); missing
 * values read as an em dash. Tooltips append their own unit.
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatPercentageValue(value) {
	if (value == null || !Number.isFinite(value)) return EMPTY_CELL;
	return formatSI(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Split a series label into its name and parenthesised qualifier — "Battery
 * (Charging)" renders the qualifier in a muted tone.
 * @param {string} label
 * @returns {{ main: string, sub: string }}
 */
export function splitTableLabel(label) {
	const index = label.indexOf(' (');
	if (index === -1) return { main: label, sub: '' };
	return { main: label.slice(0, index), sub: label.slice(index + 1) };
}

/**
 * A number to a fixed number of decimal places, grouped (`1,234.50`);
 * missing values read as an em dash.
 * @param {number | null | undefined} value @param {number} [digits]
 * @returns {string}
 */
export function formatFixed(value, digits = 2) {
	if (value == null || !Number.isFinite(value)) return EMPTY_CELL;
	return value.toLocaleString('en-AU', {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}

/**
 * Dollars, compact: `$1.2M`, `$350k`, `-$40`; missing values read as an em dash.
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatDollarsCompact(value) {
	if (value == null || !Number.isFinite(value)) return EMPTY_CELL;
	const text = Math.abs(value).toLocaleString('en-AU', {
		notation: 'compact',
		maximumFractionDigits: 1
	});
	return `${value < 0 ? '-' : ''}$${text}`;
}

/**
 * The SI prefix that keeps tonnes under five digits: t, kt or Mt.
 * @param {number} max - The largest magnitude shown
 * @returns {SiPrefix}
 */
export function tonnesPrefix(max) {
	if (max >= 10_000_000) return 'M';
	if (max >= 10_000) return 'k';
	return '';
}
