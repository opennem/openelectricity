import { getFueltechColor } from './fueltech-display';

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
 * @typedef {Object} UnitGroup
 * @property {string} fueltech_id
 * @property {string} status_id
 * @property {any[]} units
 * @property {boolean} isCommissioning
 * @property {number} totalCapacity
 * @property {string} bgColor
 * @property {number} capacity_maximum
 * @property {number} capacity_registered
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

	for (const unit of facility.units) {
		// Optionally skip battery_charging and battery_discharging
		if (
			skipBattery &&
			(unit.fueltech_id === 'battery_charging' || unit.fueltech_id === 'battery_discharging')
		) {
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
		const capacity_maximum = sumField(group.units, 'capacity_maximum');
		const capacity_registered = sumField(group.units, 'capacity_registered');
		const max_generation = sumField(group.units, 'max_generation');

		return {
			fueltech_id: group.fueltech_id,
			status_id: group.status_id,
			units: group.units,
			isCommissioning: group.units.some((unit) => unit.isCommissioning),
			totalCapacity: capacity_maximum || capacity_registered,
			bgColor: getFueltechColor(group.fueltech_id),
			capacity_maximum,
			capacity_registered,
			max_generation
		};
	});
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
