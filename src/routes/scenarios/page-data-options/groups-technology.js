import simpleGroup from '$lib/fuel-tech-groups/scenarios/simple';
import detailedGroup from '$lib/fuel-tech-groups/scenarios/detailed';

export const groups = [simpleGroup, detailedGroup];
export const groupOptions = groups.map((group) => ({
	label: group.label,
	value: group.value
}));

/** create direct maps to fueltech and order */
/** @type {*} */
export let fuelTechMap = {};
/** @type {*} */
export let orderMap = {};
groups.forEach((group) => {
	fuelTechMap[group.value] = group.fuelTechs;
	orderMap[group.value] = group.order;
});
