/**
 * Fuel Tech Groups Configuration
 *
 * Provides grouping configurations for fuel technology data visualization.
 * Maps fuel techs to display groups and defines ordering/labeling.
 */

import detailedGroup from '$lib/fuel-tech-groups/detailed';
import simpleGroup from '$lib/fuel-tech-groups/simple';
import renewablesFossilsGroup from '$lib/fuel-tech-groups/renewables-fossils';

/**
 * @typedef {Object} FuelTechGroup
 * @property {string} label - Display label for the group
 * @property {string} value - Unique identifier for the group
 * @property {Record<string, string[]>} fuelTechs - Map of group ID to fuel tech codes
 * @property {string[]} order - Display order for fuel techs
 * @property {Record<string, string>} labels - Map of fuel tech code to display label
 * @property {(acc: Record<string, string>, d: any) => Record<string, string>} fuelTechNameReducer
 */

/**
 * @typedef {Object} GroupOption
 * @property {string} label - Display label
 * @property {string} value - Group identifier
 */

/** @type {FuelTechGroup[]} */
export const groups = [detailedGroup, simpleGroup, renewablesFossilsGroup];

/** @type {GroupOption[]} */
export const groupOptions = groups.map((group) => ({
	label: group.label,
	value: group.value
}));

/** @type {Record<string, Record<string, string[]>>} */
export const fuelTechMap = {};

/** @type {Record<string, string[]>} */
export const orderMap = {};

/** @type {Record<string, (acc: Record<string, string>, d: any) => Record<string, string>>} */
export const labelReducer = {};

// Build lookup maps from groups
for (const group of groups) {
	fuelTechMap[group.value] = group.fuelTechs;
	orderMap[group.value] = group.order;
	labelReducer[group.value] = group.fuelTechNameReducer;
}

/** Default group to use */
export const DEFAULT_GROUP = 'detailed';
