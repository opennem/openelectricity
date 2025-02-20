import simpleGroup from '$lib/fuel-tech-groups/simple-with-split-solar';
export const groups = [simpleGroup];

export const groupOptions = groups.map((group) => ({
	label: group.label,
	value: group.value
}));

/** create direct maps to fueltech and order */
/** @type {*} */
export let fuelTechMap = {};
/** @type {*} */
export let orderMap = {};
/** @type {*} */
export let labelReducer = {};
groups.forEach((group) => {
	fuelTechMap[group.value] = group.fuelTechs;
	orderMap[group.value] = group.order;
	labelReducer[group.value] = group.fuelTechNameReducer;
});
