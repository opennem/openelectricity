/**
 * @param {string} unitString
 * @returns {{baseUnit: string, prefix: SiPrefix}}
 */
export function parseUnit(unitString) {
	// Extract the prefix and the base unit from the input string
	const prefixMatch = unitString.match(/^[kMGT]?/); // Match any of k, M, G, T or none
	const prefix = /** @type {SiPrefix} */ (prefixMatch ? prefixMatch[0] : '');
	const baseUnit = unitString.slice(prefix.length);

	return { baseUnit, prefix };
}

export const BASE = '';
export const KILO = 'k';
export const MEGA = 'M';
export const GIGA = 'G';
export const TERA = 'T';

/** @type {SiPrefix[]} */
export const SI_PREFIXES = [BASE, KILO, MEGA, GIGA, TERA];

/**
 *
 * @param {SiPrefix} prefix
 * @returns {SiPrefix}
 */
export function getNextPrefix(prefix) {
	const index = SI_PREFIXES.indexOf(prefix);
	return index === SI_PREFIXES.length - 1 ? SI_PREFIXES[0] : SI_PREFIXES[index + 1];
}

// // non-SI prefixes, for financial data
// export const THOUSAND = 'k'
// export const MILLION = 'm'

/** @type {Object.<SiPrefix, number>} */
export const EXPONENT = {};
EXPONENT[BASE] = 0;
EXPONENT[KILO] = 3;
EXPONENT[MEGA] = 6;
EXPONENT[GIGA] = 9;
EXPONENT[TERA] = 12;

// EXPONENT[THOUSAND] = 3
// EXPONENT[MILLION] = 6

/**
 * Convert a value from one SI prefix to another
 * @param {SiPrefix} fromPrefix
 * @param {SiPrefix} toPrefix
 * @param {number} value
 * @returns {number}
 */
export function convert(fromPrefix, toPrefix, value) {
	const fromExponent = EXPONENT[fromPrefix];
	const toExponent = EXPONENT[toPrefix];
	return value || value === 0 ? value * Math.pow(10, fromExponent - toExponent) : NaN;
}

/**
 * Format a value with explicit SI prefix conversion.
 *
 * Combines `convert()` with `Intl.NumberFormat` into a single call
 * for convenient, explicit SI-prefixed formatting anywhere.
 *
 * @param {number | null | undefined} value
 * @param {Object} [options]
 * @param {SiPrefix} [options.fromPrefix] - SI prefix the value is currently in (default: '')
 * @param {SiPrefix} [options.toPrefix] - SI prefix to display as (default: '')
 * @param {string} [options.baseUnit] - Base unit to append (e.g. 'W', 'Wh')
 * @param {number} [options.maximumFractionDigits] - Decimal places (default: auto based on magnitude)
 * @param {boolean} [options.useGrouping] - Use thousands separator (default: true)
 * @returns {string}
 */
export function formatSI(value, options = {}) {
	const {
		fromPrefix = /** @type {SiPrefix} */ (''),
		toPrefix = /** @type {SiPrefix} */ (''),
		baseUnit = '',
		maximumFractionDigits,
		useGrouping = true
	} = options;

	if (value == null || isNaN(value)) return '—';

	const converted = convert(fromPrefix, toPrefix, value);
	if (isNaN(converted)) return '—';

	const abs = Math.abs(converted);
	const digits =
		maximumFractionDigits !== undefined
			? maximumFractionDigits
			: abs < 10
				? 2
				: abs < 100
					? 1
					: 0;

	const formatted = new Intl.NumberFormat('en-AU', {
		maximumFractionDigits: digits,
		useGrouping
	}).format(converted);

	return baseUnit ? `${formatted} ${toPrefix}${baseUnit}` : formatted;
}
