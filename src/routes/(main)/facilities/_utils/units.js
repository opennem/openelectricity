import { getFueltechColor } from '$lib/utils/fueltech-display';
import { sumUnitCapacities } from '$lib/utils/capacity';
import { sortByDetailedOrder } from '$lib/fuel-tech-groups/detailed';
import isCommissioningCheck from './is-commissioning';

/** Fuel techs of the split units derived from a bidirectional `battery` unit. */
const DERIVED_BATTERY_FUEL_TECHS = ['battery_charging', 'battery_discharging'];

/**
 * Check if a facility has a bidirectional battery unit (fueltech_id === 'battery').
 * When present, the separate charging/discharging units are derived and should be excluded.
 * @param {any} facility
 * @returns {boolean}
 */
export function hasBidirectionalBattery(facility) {
	return (facility?.units ?? []).some((/** @type {any} */ unit) => unit.fueltech_id === 'battery');
}

/**
 * Filter out battery_charging and battery_discharging units, but only when the facility
 * also has a bidirectional battery unit (fueltech_id === 'battery'), since the
 * charging/discharging units are derived from it.
 * @param {any[]} units
 * @param {boolean} hasBidirectional - whether the facility has a bidirectional battery unit
 * @returns {any[]}
 */
export function filterDerivedBatteryUnits(units, hasBidirectional) {
	if (!hasBidirectional) return units;
	return units.filter(
		(/** @type {any} */ unit) => !DERIVED_BATTERY_FUEL_TECHS.includes(unit.fueltech_id)
	);
}

/**
 * Whether a facility can offer the split (charge/discharge) battery view: it has
 * a bidirectional battery unit AND the derived charging/discharging units to swap
 * in. Facilities with only native charge/discharge units (no bidirectional) show
 * them in the net view already, so no switch is needed.
 * @param {any} facility
 * @returns {boolean}
 */
export function canSplitBatteryUnits(facility) {
	if (!hasBidirectionalBattery(facility)) return false;
	return (facility?.units ?? []).some((/** @type {any} */ unit) =>
		DERIVED_BATTERY_FUEL_TECHS.includes(unit.fueltech_id)
	);
}

/**
 * Sum a numeric field across units
 * @param {any[]} units
 * @param {string} field
 * @returns {number}
 */
export function sumField(units, field) {
	return units.reduce((sum, unit) => sum + (Number(unit[field]) || 0), 0);
}

/**
 * A facility's headline capacity in MW: per-unit maximum-falling-back-to-
 * registered, summed net of derived battery charge/discharge units (so a
 * bidirectional battery isn't double-counted).
 * @param {any} facility
 * @returns {number}
 */
export function getFacilityCapacity(facility) {
	return sumUnitCapacities(
		filterDerivedBatteryUnits(facility?.units ?? [], hasBidirectionalBattery(facility))
	);
}

/**
 * @typedef {Object} UnitGroup
 * @property {string} fueltech_id
 * @property {string} status_id
 * @property {any[]} units
 * @property {boolean} isCommissioning
 * @property {number} totalCapacity - sum of per-unit capacity (maximum falling back to registered, per unit)
 * @property {string} bgColor
 * @property {number} capacity_storage
 * @property {number} max_generation
 */

/**
 * Group units by fueltech_id and status_id
 * @param {any} facility - The facility object containing units
 * @param {{ skipBattery?: boolean }} [options] - Options for grouping
 * @returns {UnitGroup[]}
 */
export function groupUnits(facility, options = {}) {
	const { skipBattery = false } = options;

	if (!facility?.units || facility.units.length === 0) return [];

	/** @type {Map<string, {fueltech_id: string, status_id: string, units: any[]}>} */
	const groups = new Map();

	const bidirectional = skipBattery && hasBidirectionalBattery(facility);

	for (const unit of facility.units) {
		// Skip battery_charging/discharging only when a bidirectional battery unit exists
		if (bidirectional && DERIVED_BATTERY_FUEL_TECHS.includes(unit.fueltech_id)) {
			continue;
		}

		const key = `${unit.fueltech_id}|||${unit.status_id}`;

		if (!groups.has(key)) {
			groups.set(key, {
				fueltech_id: unit.fueltech_id,
				status_id: unit.status_id,
				units: []
			});
		}
		groups.get(key)?.units.push({ ...unit, isCommissioning: unit.isCommissioning });
	}

	return Array.from(groups.values()).map((group) => {
		return {
			fueltech_id: group.fueltech_id,
			status_id: group.status_id,
			units: group.units,
			isCommissioning: group.units.some((unit) => unit.isCommissioning),
			totalCapacity: sumUnitCapacities(group.units),
			bgColor: getFueltechColor(group.fueltech_id),
			capacity_storage: sumField(group.units, 'capacity_storage'),
			max_generation: sumField(group.units, 'max_generation')
		};
	});
}

/**
 * Ordered, de-duplicated fuel-tech groups for a facility's icon row — sorted
 * top-of-stack first (reversed detailed order, mirroring the chart and the
 * facility detail panel) and reduced to one entry per `fueltech_id`. Shared by
 * the detail-panel header and the facilities list so their badge rows show the
 * same fuel techs in the same order.
 * @param {any} facility
 * @returns {UnitGroup[]}
 */
export function getOrderedFuelTechGroups(facility) {
	const sorted = sortByDetailedOrder(groupUnits(facility, { skipBattery: true }), {
		reverse: true
	});
	/** @type {Map<string, UnitGroup>} */
	const seen = new Map();
	for (const group of sorted) {
		if (!seen.has(group.fueltech_id)) seen.set(group.fueltech_id, group);
	}
	return [...seen.values()];
}

/**
 * Normalise a raw API facility for display: resolve the battery unit set and
 * mark commissioning units (`isCommissioning` + `status_id`). This is the same
 * client-side processing the /facilities list applies server-side via
 * `processFacilitiesWithStatuses`, extracted so the /facility/[code] page and the
 * /facilities detail panel present the canonical full facility identically from
 * the raw `fetchFacilityByCode` shape.
 *
 * `batteryView` picks which battery units survive when a bidirectional `battery`
 * unit exists: `'net'` (default) drops the derived charging/discharging units;
 * `'split'` keeps them and drops the bidirectional unit instead. Callers should
 * gate `'split'` on `canSplitBatteryUnits`.
 * @param {any} facility
 * @param {{ batteryView?: 'net' | 'split' }} [options]
 * @returns {any}
 */
export function withMarkedUnits(facility, { batteryView = 'net' } = {}) {
	if (!facility?.units) return facility;
	const hasBidirectional = hasBidirectionalBattery(facility);
	const filtered =
		batteryView === 'split' && hasBidirectional
			? facility.units.filter((/** @type {any} */ unit) => unit.fueltech_id !== 'battery')
			: filterDerivedBatteryUnits(facility.units, hasBidirectional);
	const units = filtered.map((/** @type {any} */ unit) =>
		isCommissioningCheck(unit, { hasBidirectionalBattery: hasBidirectional })
			? { ...unit, isCommissioning: true, status_id: 'commissioning' }
			: unit
	);
	return { ...facility, units };
}

/**
 * Get the OpenElectricity explore URL for a facility
 * @param {any} facility
 * @returns {string}
 */
export function getExploreUrl(facility) {
	if (!facility) return '';
	return `https://explore.openelectricity.org.au/facility/au/${facility.network_id}/${facility.code}/`;
}
