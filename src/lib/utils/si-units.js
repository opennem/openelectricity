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
