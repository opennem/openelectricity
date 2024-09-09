import sourcesLoadsGroup from '$lib/fuel-tech-groups/sources-loads';
import sourcesWithoutBattery from '$lib/fuel-tech-groups/sources-without-battery';

// Customise group labels
export const netGroup = {
	...sourcesLoadsGroup,
	label: 'Net Generation'
};

export const groups = [netGroup, sourcesWithoutBattery];
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
