/**
 * Unit analysis for facility charts.
 *
 * Computes colour maps, fuel-tech lookups, ordering, load/battery flags,
 * capacity sums, and weighted emissions intensity from a facility's units.
 */

import { loadFuelTechs } from '$lib/fuel_techs';
import { sortByDetailedOrder } from '$lib/fuel-tech-groups/detailed';
import { buildUnitColourMap } from './helpers.js';

const BATTERY_FUEL_TECHS = ['battery'];

/**
 * @typedef {Object} UnitAnalysis
 * @property {Record<string, string>} unitColours       - unit code → hex colour
 * @property {Record<string, string>} unitFuelTechMap    - unit code → fuel tech id
 * @property {Record<string, string>} unitCodeDisplayMap - unit code → display code (only units that have one)
 * @property {string[]}               unitOrder          - series ids in fuel-tech display order
 * @property {string[]}               loadIds            - series ids that are loads (to invert)
 * @property {string}                 unitsKey           - identity of the unit set (see unitsKeyFor)
 * @property {boolean}                hasBatteryUnits    - whether any unit is a battery
 * @property {{ positive: number, negative: number }} capacitySums - generation / load capacity
 * @property {number | null}          weightedEmissionsIntensity - kgCO2/MWh (generators only), or null
 */

/**
 * Stable identity of a unit set. ChartDataManager bakes its unit maps in at
 * construction, so owners compare this key to detect a units-only change (e.g.
 * battery net ⇄ split) that requires a new manager even though
 * facility/interval/metric are unchanged.
 * @param {Record<string, string>} unitFuelTechMap
 * @returns {string}
 */
export function unitsKeyFor(unitFuelTechMap) {
	return Object.keys(unitFuelTechMap).sort().join('|');
}

/**
 * Series ids for a set of unit codes under a metric prefix — the single home
 * for the `<metric>_<code>` naming convention (matching the OE API series
 * names and `unitOrder` below). Used to map units-panel toggles onto each
 * chart store's `hiddenSeriesNames`.
 * @param {string} metric - e.g. 'power' | 'energy' | 'market_value' | 'emissions'
 * @param {string[]} codes
 * @returns {string[]}
 */
export function unitSeriesIds(metric, codes) {
	return codes.map((code) => `${metric}_${code}`);
}

const labelCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Compare units by their display label (`code_display` when present, else
 * `code`), numeric-aware so e.g. GT2 sorts before GT10. Used as the tie-break
 * within fuel-tech ordering wherever units are listed or stacked.
 *
 * @param {any} a
 * @param {any} b
 * @returns {number}
 */
export function compareUnitsByLabel(a, b) {
	const aLabel = String(a?.code_display ?? a?.code ?? '');
	const bLabel = String(b?.code_display ?? b?.code ?? '');
	return labelCollator.compare(aLabel, bLabel);
}

/**
 * The canonical display order for a facility's units: fuel-tech stack order
 * primary (chart paint order), display label as the tie-break within each
 * fuel tech. Used by both the chart pipeline (`analyzeUnits`) and the units
 * panel so the two can't drift.
 *
 * @template {{ fueltech_id: string }} T
 * @param {T[]} units
 * @param {{ reverse?: boolean }} [options]
 * @returns {T[]}
 */
export function sortUnitsForDisplay(units, options) {
	return sortByDetailedOrder([...units].sort(compareUnitsByLabel), options);
}

/**
 * Analyse a facility's units in one pass.
 *
 * @param {any} facility - Facility object with `units` array
 * @param {(ftCode: string) => string} getFuelTechColor - Base colour resolver
 * @returns {UnitAnalysis}
 */
export function analyzeUnits(facility, getFuelTechColor) {
	// Canonical display order (fuel-tech primary, label tie-break) drives
	// `unitOrder` (chart stack/tooltip order) and the colour-shade gradient.
	const units = /** @type {any[]} */ (sortUnitsForDisplay(facility?.units ?? []));

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

	// ── ordering — `units` is already in canonical display order ──
	const unitOrder = units.map((/** @type {any} */ unit) => `power_${unit.code}`);

	// ── load ids ──────────────────────────────────────────────────
	/** @type {string[]} */
	const loadIds = [];
	for (const unit of units) {
		if (loadFuelTechs.includes(unit.fueltech_id)) {
			loadIds.push(`power_${unit.code}`);
		}
	}

	// ── battery flag ──────────────────────────────────────────────
	const hasBatteryUnits = units.some((/** @type {any} */ u) =>
		BATTERY_FUEL_TECHS.includes(u.fueltech_id)
	);

	// ── capacity sums ─────────────────────────────────────────────
	let positive = 0;
	let negative = 0;
	const allBattery = units.every((/** @type {any} */ u) =>
		BATTERY_FUEL_TECHS.includes(u.fueltech_id)
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
		unitsKey: unitsKeyFor(unitFuelTechMap),
		hasBatteryUnits,
		capacitySums,
		weightedEmissionsIntensity
	};
}
