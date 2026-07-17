/**
 * Shared series colour helpers for chart components.
 *
 * Chart series fall back to a neutral grey for unknown fuel techs — distinct
 * from `fuelTechColour` in `$lib/fuel_techs.js`, whose white fallback the
 * info-graphics rely on.
 */

import { fuelTechColourMap } from '$lib/theme/openelectricity';

export const SERIES_FALLBACK_COLOUR = '#888888';

/**
 * Resolve a fuel tech (or fuel-tech group) code to its theme colour.
 *
 * @param {string} ftCode
 * @returns {string}
 */
export function getFuelTechColour(ftCode) {
	return (
		fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] ||
		SERIES_FALLBACK_COLOUR
	);
}
