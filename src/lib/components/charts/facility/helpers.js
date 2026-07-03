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
 * @param {string} [metricFilter] - Metric to filter for (default: 'power')
 * @returns {any[]}
 */
export function transformFacilityPowerData(powerResponse, unitFuelTechMap, metricFilter = 'power') {
	if (!powerResponse?.data) return [];

	const result = [];

	for (const metric of powerResponse.data) {
		if (metric.metric !== metricFilter) continue;

		for (const series of metric.results || []) {
			const unitCode = series.columns?.unit_code || series.name?.replace(`${metricFilter}_`, '');
			const fuelTech = unitFuelTechMap[unitCode] || 'unknown';

			// Extract values and timestamps
			const dataPoints = series.data || [];
			if (!dataPoints.length) continue;

			const values = dataPoints.map((/** @type {[string, number]} */ d) => d[1]);
			const startTime = dataPoints[0]?.[0];
			const lastTime = dataPoints[dataPoints.length - 1]?.[0];

			result.push({
				id: series.name || `${metricFilter}_${unitCode}`,
				type: metricFilter,
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
 * Default shade spread around the base colour. Kept tight so units of the
 * same fuel tech read as one colour family rather than unrelated colours.
 * Exported so the /studio/fueltech-shades tuning page always reflects the
 * real production values.
 */
export const DEFAULT_SHADE_SPREAD = { darken: 0.6, brighten: 0.4 };

/**
 * Per-fuel-tech spread overrides for base colours the default range can't
 * shade. coal_black (#121212) is near-black — darkening is invisible, so its
 * range anchors at the base and spreads upward instead.
 *
 * @type {Record<string, { darken: number, brighten: number }>}
 */
export const SHADE_SPREADS = {
	coal_black: { darken: 0, brighten: 2 }
};

/**
 * Generate shades for units with the same fuel tech — an interpolated ramp
 * from darkened to brightened around the base colour (unit 1 darkest).
 *
 * @param {string} baseColor - Base fuel tech color (hex)
 * @param {number} count - Number of units with this fuel tech
 * @param {{ darken: number, brighten: number }} [spread] - Range around the base colour
 * @param {string} [mode] - chroma interpolation mode (the shades tuning page previews others)
 * @returns {string[]} - Array of hex colors
 */
export function generateUnitShades(baseColor, count, spread = DEFAULT_SHADE_SPREAD, mode = 'lab') {
	if (count === 1) return [baseColor];

	const darkened = chroma(baseColor).darken(spread.darken).hex();
	const brightened = chroma(baseColor).brighten(spread.brighten).hex();

	return chroma
		.scale([darkened, brightened])
		.mode(/** @type {any} */ (mode))
		.colors(count);
}

/**
 * Build a display-label getter for chart series. The returned closure is
 * handed to ChartDataManagers, which call it from async fetch continuations
 * that can outlive the creating component — so it must only capture plain
 * values, never read a component `$derived` lazily (svelte `derived_inert`).
 *
 * @param {Record<string, string>} unitCodeDisplayMap - unit code → display code
 * @param {Record<string, string>} fuelTechNames - fuel tech id → display name
 * @returns {(unitCode: string, fuelTech: string) => string}
 */
export function makeUnitLabelGetter(unitCodeDisplayMap, fuelTechNames) {
	return (unitCode, fuelTech) => {
		const displayCode = unitCodeDisplayMap[unitCode] ?? unitCode;
		return `${displayCode} (${fuelTechNames[fuelTech] || fuelTech})`;
	};
}

/**
 * Build a series-colour getter that brightens load series (battery charging,
 * pumps) against their generation siblings. Same plain-capture constraint as
 * `makeUnitLabelGetter` — the closure outlives the creating component.
 *
 * @param {Record<string, string>} colourMap - unit code → hex colour
 * @param {string[]} loadIds - load series ids with the given prefix
 * @param {string} prefix - series id prefix ('power' | 'market_value' | 'emissions' | 'energy')
 * @param {(ftCode: string) => string} getFuelTechColor - base colour fallback
 * @returns {(unitCode: string, fuelTech: string) => string}
 */
export function makeLoadAwareColourGetter(colourMap, loadIds, prefix, getFuelTechColor) {
	const loadIdSet = new Set(loadIds);
	return (unitCode, fuelTech) => {
		const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
		return loadIdSet.has(`${prefix}_${unitCode}`) ? chroma(baseColor).brighten(1).hex() : baseColor;
	};
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
		const shades = generateUnitShades(baseColor, unitCodes.length, SHADE_SPREADS[ft]);

		unitCodes.forEach((code, index) => {
			colours[code] = shades[index];
		});
	}

	return colours;
}
