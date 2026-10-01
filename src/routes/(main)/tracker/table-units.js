/**
 * Unit cycles for the fuel-tech table's value columns. Clicking a column
 * header steps its SI prefix to the next entry, wrapping at the end. Each
 * prefix is relative to the column's base: energy and power scale watts,
 * emissions scale tonnes, and intensity scales the grams in g/MWh (kg = k,
 * t = M). Price has no SI set, so it is not listed.
 *
 * @typedef {'energy' | 'power' | 'emissions' | 'intensity'} TableUnitKey
 * @typedef {Partial<Record<TableUnitKey, SiPrefix>>} TableUnits
 */

/** @type {Record<TableUnitKey, { prefixes: SiPrefix[], label: (prefix: SiPrefix) => string }>} */
export const TABLE_UNIT_CYCLES = {
	energy: { prefixes: ['M', 'G', 'T'], label: (prefix) => `${prefix}Wh` },
	power: { prefixes: ['M', 'G'], label: (prefix) => `${prefix}W` },
	emissions: { prefixes: ['', 'k', 'M'], label: (prefix) => `${prefix}tCO₂e` },
	intensity: {
		prefixes: ['k', 'M'],
		label: (prefix) => (prefix === 'M' ? 'tCO₂e/MWh' : 'kgCO₂e/MWh')
	}
};

/**
 * The prefix after `current` in a column's cycle. An unlisted prefix starts
 * the cycle from its first entry.
 *
 * @param {TableUnitKey} key
 * @param {SiPrefix} current
 * @returns {SiPrefix}
 */
export function nextTableUnitPrefix(key, current) {
	const { prefixes } = TABLE_UNIT_CYCLES[key];
	return prefixes[(prefixes.indexOf(current) + 1) % prefixes.length];
}
