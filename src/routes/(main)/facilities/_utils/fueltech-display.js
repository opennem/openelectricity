import { fuelTechColourMap } from '$lib/theme/openelectricity';

/** Fueltechs that need dark text for contrast on their background color */
const LIGHT_FUELTECHS = ['solar_utility', 'solar', 'solar_rooftop', 'gas_ocgt', 'gas_recip'];

/**
 * Check if fueltech needs dark text (for light backgrounds)
 * @param {string} fueltech
 * @returns {boolean}
 */
export function needsDarkText(fueltech) {
	return LIGHT_FUELTECHS.includes(fueltech);
}

/**
 * Get the background color for a fueltech
 * @param {string} fueltech
 * @returns {string}
 */
export function getFueltechColor(fueltech) {
	return fuelTechColourMap[fueltech] || '#FFFFFF';
}
