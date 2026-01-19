import detailedGroup from '$lib/fuel-tech-groups/detailed';
import simpleGroup from '$lib/fuel-tech-groups/simple';
import renewablesFossilsGroup from '$lib/fuel-tech-groups/renewables-fossils';

const groups = [detailedGroup, simpleGroup, renewablesFossilsGroup];

/** @type {Record<string, Record<string, string[]>>} */
export const fuelTechMap = {};
/** @type {Record<string, string[]>} */
export const orderMap = {};
/** @type {Record<string, Function>} */
export const labelReducer = {};

groups.forEach((group) => {
	fuelTechMap[group.value] = group.fuelTechs;
	orderMap[group.value] = group.order;
	labelReducer[group.value] = group.fuelTechNameReducer;
});
