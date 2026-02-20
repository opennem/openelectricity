/**
 * Unit analysis for facility charts.
 *
 * Computes colour maps, fuel-tech lookups, ordering, load/battery flags,
 * capacity sums, and weighted emissions intensity from a facility's units.
 */

import { loadFuelTechs } from '$lib/fuel_techs';
import detailedGroup from '$lib/fuel-tech-groups/detailed';
import { buildUnitColourMap } from './helpers.js';

const fuelTechOrder = detailedGroup.order;
const BATTERY_FUEL_TECHS = ['battery'];

/**
 * @typedef {Object} UnitAnalysis
 * @property {Record<string, string>} unitColours       - unit code → hex colour
 * @property {Record<string, string>} unitFuelTechMap    - unit code → fuel tech id
 * @property {Record<string, string>} unitCodeDisplayMap - unit code → display code (only units that have one)
 * @property {string[]}               unitOrder          - series ids in fuel-tech display order
 * @property {string[]}               loadIds            - series ids that are loads (to invert)
 * @property {boolean}                hasBatteryUnits    - whether any unit is a battery
 * @property {{ positive: number, negative: number }} capacitySums - generation / load capacity
 * @property {number | null}          weightedEmissionsIntensity - kgCO2/MWh (generators only), or null
 */

/**
 * Analyse a facility's units in one pass.
 *
 * @param {any} facility - Facility object with `units` array
 * @param {(ftCode: string) => string} getFuelTechColor - Base colour resolver
 * @returns {UnitAnalysis}
 */
export function analyzeUnits(facility, getFuelTechColor) {
	const units = facility?.units ?? [];

	// ── colour map ────────────────────────────────────────────────
	const unitColours = units.length ? buildUnitColourMap(units, getFuelTechColor) : {};

	// ── fuel-tech & display maps ──────────────────────────────────
	/** @type {Record<string, string>} */
	const unitFuelTechMap = {};
	/** @type {Record<string, string>} */
	const unitCodeDisplayMap = {};

	for (const unit of units) {
		unitFuelTechMap[unit.code] = unit.fueltech_id;
		if (unit.code_display) {
			unitCodeDisplayMap[unit.code] = unit.code_display;
		}
	}

	// ── ordering (by fuel-tech display order) ─────────────────────
	const unitPairs = units.map((/** @type {any} */ unit) => ({
		id: `power_${unit.code}`,
		fueltech: unit.fueltech_id
	}));
	unitPairs.sort((/** @type {any} */ a, /** @type {any} */ b) => {
		const aPos = fuelTechOrder.indexOf(a.fueltech);
		const bPos = fuelTechOrder.indexOf(b.fueltech);
		return (aPos === -1 ? 999 : aPos) - (bPos === -1 ? 999 : bPos);
	});
	const unitOrder = unitPairs.map((/** @type {any} */ p) => p.id);

	// ── load ids ──────────────────────────────────────────────────
	/** @type {string[]} */
	const loadIds = [];
	for (const unit of units) {
		if (loadFuelTechs.includes(unit.fueltech_id)) {
			loadIds.push(`power_${unit.code}`);
		}
	}

	// ── battery flag ──────────────────────────────────────────────
	const hasBatteryUnits = units.some(
		(/** @type {any} */ u) => BATTERY_FUEL_TECHS.includes(u.fueltech_id)
	);

	// ── capacity sums ─────────────────────────────────────────────
	let positive = 0;
	let negative = 0;
	const allBattery = units.every(
		(/** @type {any} */ u) => BATTERY_FUEL_TECHS.includes(u.fueltech_id)
	);
	for (const unit of units) {
		const capacity = Number(unit.capacity_maximum || unit.capacity_registered) || 0;
		if (loadFuelTechs.includes(unit.fueltech_id)) {
			negative += capacity;
		} else if (allBattery && unit.fueltech_id === 'battery') {
			positive += capacity;
			negative += capacity;
		} else {
			positive += capacity;
		}
	}
	const capacitySums = { positive, negative };

	// ── weighted emissions intensity ──────────────────────────────
	let totalWeighted = 0;
	let totalCap = 0;
	for (const unit of units) {
		const ef = Number(unit.emissions_factor_co2);
		const cap = Number(unit.capacity_maximum || unit.capacity_registered);
		if (ef && cap && !isNaN(ef) && !isNaN(cap) && unit.dispatch_type !== 'LOAD') {
			totalWeighted += ef * cap;
			totalCap += cap;
		}
	}
	let weightedEmissionsIntensity = null;
	if (totalCap > 0) {
		const result = (totalWeighted / totalCap) * 1000;
		weightedEmissionsIntensity = isNaN(result) ? null : result;
	}

	return {
		unitColours,
		unitFuelTechMap,
		unitCodeDisplayMap,
		unitOrder,
		loadIds,
		hasBatteryUnits,
		capacitySums,
		weightedEmissionsIntensity
	};
}
