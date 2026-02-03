import { fuelTechOptions } from './filters.js';

/**
 * Generate fuel tech category-to-API-ids mapping from fuelTechOptions
 * Maps category values (like 'gas') to their sub-technology API IDs (like ['gas_ccgt', 'gas_ocgt', ...])
 * For categories without children, maps to their own value (e.g., 'battery' -> ['battery'])
 *
 * @returns {Record<string, string[]>}
 */
export function getFuelTechMap() {
	/** @type {Record<string, string[]>} */
	const map = {};

	for (const opt of fuelTechOptions) {
		if (opt.children && opt.children.length > 0) {
			// Category with sub-technologies
			map[opt.value] = opt.children.map((child) => child.value);
		} else {
			// Single fuel tech - maps to itself
			map[opt.value] = [opt.value];
		}
	}

	return map;
}

/**
 * Expand fuel tech selections to API fuel tech IDs
 * If a category (like "gas") is selected, expand to all sub-technologies
 * If a specific fuel tech ID (like "gas_ccgt") is selected, use it directly
 *
 * @param {string[]} fuelTechs - Selected fuel tech values (may include categories or specific IDs)
 * @returns {string[]} - Expanded list of API fuel tech IDs
 */
export function expandFuelTechs(fuelTechs) {
	const fuelTechMap = getFuelTechMap();

	return fuelTechs
		.map((fuelTech) => {
			if (fuelTechMap[fuelTech]) {
				// It's a category, expand to all sub-technologies
				return fuelTechMap[fuelTech];
			}
			// It's a specific fuel tech ID, use directly
			return [fuelTech];
		})
		.flat();
}
