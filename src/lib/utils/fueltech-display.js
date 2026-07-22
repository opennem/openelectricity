import { fuelTechColourMap } from '$lib/theme/openelectricity';

/** Fueltechs that need dark text for contrast on their background color */
const LIGHT_FUELTECHS = [
	'solar_utility',
	'solar',
	'solar_rooftop',
	'gas_ocgt',
	'gas_recip',
	'data_centre'
];

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

/**
 * Colour of a facility's most common unit fuel-tech — used to tint map markers
 * and footprints. Falls back to white when no fuel-tech is present.
 * @param {Array<{ fueltech_id?: string }>} [units]
 * @returns {string}
 */
export function primaryFuelTechColour(units) {
	/** @type {Record<string, number>} */
	const counts = {};
	for (const unit of units ?? []) {
		if (unit.fueltech_id) counts[unit.fueltech_id] = (counts[unit.fueltech_id] || 0) + 1;
	}
	let maxFt = '';
	let maxCount = 0;
	for (const [ft, count] of Object.entries(counts)) {
		if (count > maxCount) {
			maxCount = count;
			maxFt = ft;
		}
	}
	return maxFt ? getFueltechColor(maxFt) : '#ffffff';
}
