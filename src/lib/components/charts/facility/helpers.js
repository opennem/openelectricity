/**
 * Utilities for Facility Explorer
 *
 * - Color shading for multiple units with same fuel tech
 * - Timezone helpers for NEM/WEM networks
 * - Data transformation for facility power data
 */

import chroma from 'chroma-js';

// ============================================
// Data Transformation
// ============================================

/**
 * Transform facility power API response to the format expected by processForChart
 *
 * API returns: { data: [{ metric, results: [{ name, columns, data: [[ts, val], ...] }] }] }
 * Expected:    [{ id, type, fuel_tech, unit, history: { start, last, interval, data } }]
 *
 * @param {any} powerResponse - Raw API response
 * @param {Record<string, string>} unitFuelTechMap - Map of unit code to fuel tech
 * @returns {any[]}
 */
export function transformFacilityPowerData(powerResponse, unitFuelTechMap) {
	if (!powerResponse?.data) return [];

	const result = [];

	for (const metric of powerResponse.data) {
		if (metric.metric !== 'power') continue;

		for (const series of metric.results || []) {
			const unitCode = series.columns?.unit_code || series.name?.replace('power_', '');
			const fuelTech = unitFuelTechMap[unitCode] || 'unknown';

			// Extract values and timestamps
			const dataPoints = series.data || [];
			if (!dataPoints.length) continue;

			const values = dataPoints.map((/** @type {[string, number]} */ d) => d[1]);
			const startTime = dataPoints[0]?.[0];
			const lastTime = dataPoints[dataPoints.length - 1]?.[0];

			result.push({
				id: series.name || `power_${unitCode}`,
				type: 'power',
				// Use fueltech_id instead of fuel_tech to avoid TimeSeries using it as series key
				// TimeSeries.seriesNames uses d.fuel_tech || d.id, we want it to use d.id
				fueltech_id: fuelTech,
				unit: {
					code: unitCode,
					fueltech_id: fuelTech
				},
				units: metric.unit || 'MW',
				history: {
					start: startTime,
					last: lastTime,
					interval: metric.interval || '5m',
					data: values
				}
			});
		}
	}

	return result;
}

// ============================================
// Timezone Helpers
// ============================================

/**
 * Get timezone offset for a network (no DST)
 * WEM = +08:00 (AWST), NEM and others = +10:00 (AEST)
 *
 * @param {string | undefined | null} networkId
 * @returns {string} Timezone offset string
 */
export function getNetworkTimezone(networkId) {
	return networkId === 'WEM' ? '+08:00' : '+10:00';
}

/**
 * Check if a network uses WEM timezone
 * @param {string | undefined | null} networkId
 * @returns {boolean}
 */
export function isWemNetwork(networkId) {
	return networkId === 'WEM';
}

// ============================================
// Color Shading Helpers
// ============================================

/**
 * Generate shades for units with the same fuel tech
 * @param {string} baseColor - Base fuel tech color (hex)
 * @param {number} count - Number of units with this fuel tech
 * @returns {string[]} - Array of hex colors
 */
export function generateUnitShades(baseColor, count) {
	if (count === 1) return [baseColor];

	// Wide range from dark to light for clear distinction between stacked units
	const darkened = chroma(baseColor).darken(1.2).hex();
	const brightened = chroma(baseColor).brighten(1.5).hex();

	return chroma.scale([darkened, brightened]).mode('lab').colors(count);
}

/**
 * Build a color map for all units in a facility, generating shades
 * for units that share the same fuel tech
 *
 * @param {Array<{code: string, fueltech_id: string}>} units - Facility units
 * @param {(ftCode: string) => string} getBaseColor - Function to get base color for fuel tech
 * @returns {Record<string, string>} - Map of unit code to hex color
 */
export function buildUnitColourMap(units, getBaseColor) {
	/** @type {Record<string, string[]>} */
	const fuelTechUnits = {};

	// Group unit codes by fuel tech
	for (const unit of units) {
		const ft = unit.fueltech_id || 'unknown';
		if (!fuelTechUnits[ft]) {
			fuelTechUnits[ft] = [];
		}
		fuelTechUnits[ft].push(unit.code);
	}

	// Generate colors for each unit
	/** @type {Record<string, string>} */
	const colours = {};

	for (const [ft, unitCodes] of Object.entries(fuelTechUnits)) {
		const baseColor = getBaseColor(ft) || '#888888';
		const shades = generateUnitShades(baseColor, unitCodes.length);

		unitCodes.forEach((code, index) => {
			colours[code] = shades[index];
		});
	}

	return colours;
}
