import detailedGroup from '#lib/fuel-tech-groups/lens/detailed.js';
import renewablesFossilsGroup from '#lib/fuel-tech-groups/lens/renewables-fossils.js';
import vreResidual from '#lib/fuel-tech-groups/lens/vre-residual.js';

export const groups = [detailedGroup, renewablesFossilsGroup, vreResidual];
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
