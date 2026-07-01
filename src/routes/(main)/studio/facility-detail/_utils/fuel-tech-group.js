/**
 * Fuel tech group detection for facility detail views.
 *
 * Classifies a facility into one of six groups based on the dominant
 * fuel technology by registered capacity. The single-code classifier lives in
 * `$lib/fuel-tech-groups/facility-group.js` so per-unit views can share it.
 */

import { fuelTechToGroup } from '$lib/fuel-tech-groups/facility-group.js';

/** @typedef {import('$lib/fuel-tech-groups/facility-group.js').FuelTechGroup} FuelTechGroup */

/**
 * Determine the primary fuel tech group for a facility based on
 * the dominant capacity across its units.
 *
 * @param {Array<{ fueltech_id?: string, capacity_registered?: number }>} units
 * @returns {FuelTechGroup}
 */
export function getPrimaryFuelTechGroup(units) {
	if (!units?.length) return 'other';

	/** @type {Record<string, number>} */
	const capacityByGroup = {};

	for (const unit of units) {
		const group = fuelTechToGroup(unit.fueltech_id ?? '');
		capacityByGroup[group] =
			(capacityByGroup[group] || 0) + (Number(unit.capacity_registered) || 0);
	}

	let maxGroup = /** @type {FuelTechGroup} */ ('other');
	let maxCap = 0;
	for (const [group, cap] of Object.entries(capacityByGroup)) {
		if (cap > maxCap) {
			maxCap = cap;
			maxGroup = /** @type {FuelTechGroup} */ (group);
		}
	}

	return maxGroup;
}

/**
 * Check if a gas facility is a peaker (OCGT or reciprocating).
 * @param {Array<{ fueltech_id?: string, capacity_registered?: number }>} units
 * @returns {boolean}
 */
export function isGasPeaker(units) {
	if (!units?.length) return false;
	const peakerTypes = ['gas_ocgt', 'gas_recip', 'distillate'];
	let peakerCap = 0;
	let totalCap = 0;
	for (const unit of units) {
		const cap = Number(unit.capacity_registered) || 0;
		totalCap += cap;
		if (peakerTypes.includes(unit.fueltech_id ?? '')) peakerCap += cap;
	}
	return totalCap > 0 && peakerCap / totalCap > 0.5;
}

/**
 * Check if a hydro facility has pumped storage.
 * @param {Array<{ fueltech_id?: string }>} units
 * @returns {boolean}
 */
export function isPumpedHydro(units) {
	if (!units?.length) return false;
	const hasHydro = units.some((u) => u.fueltech_id === 'hydro');
	const hasPumps = units.some((u) => u.fueltech_id === 'pumps');
	return hasHydro && hasPumps;
}
