/**
 * Define a mapping for SI prefixes to their multipliers
 * @type {Object.<SiPrefix, number>}
 */
export const siPrefixes = {
	'': 1, // No prefix
	k: 1e3, // kilo
	M: 1e6, // mega
	G: 1e9, // giga
	T: 1e12 // tera
};

/**
 * @param {string} unitString
 * @returns {{multiplier: number, baseUnit: string}}
 */
export function parseUnit(unitString) {
	// Extract the prefix and the base unit from the input string
	const prefixMatch = unitString.match(/^[kMGT]?/); // Match any of k, M, G, T or none
	const prefix = prefixMatch ? prefixMatch[0] : '';
	const baseUnit = unitString.slice(prefix.length);

	// Get the multiplier corresponding to the prefix
	const multiplier = siPrefixes[prefix];
	return { multiplier, baseUnit };
}

/**
 * @param {number} value
 * @param {SiPrefix} prefix
 * @returns {number}
 */
export function convertValue(value, prefix) {
	return value * siPrefixes[prefix];
}
