import * as detailed from './detailed';
import * as simple from './simple';
import * as renewablesVsFossils from './renewables-vs-fossils';
import * as totals from './totals';

const detailedGroup = {
	label: 'Detailed',
	value: 'detailed',
	fuelTechs: detailed.fuelTechMap,
	order: detailed.order
};
const simpleGroup = {
	label: 'Simple',
	value: 'simple',
	fuelTechs: simple.fuelTechMap,
	order: simple.order
};
const renewablesVsFossilsGroup = {
	label: 'Renewables vs Fossil Fuels',
	value: 'renewables_vs_fossil_fuels',
	fuelTechs: renewablesVsFossils.fuelTechMap,
	order: renewablesVsFossils.order
};
const totalsGroup = {
	label: 'Totals',
	value: 'totals',
	fuelTechs: totals.fuelTechMap,
	order: totals.order
};

const groups = [detailedGroup, simpleGroup, renewablesVsFossilsGroup, totalsGroup];

/** @type {*} */
let groupMap = {};
/** @type {*} */
let orderMap = {};

groups.forEach((group) => {
	groupMap[group.value] = group.fuelTechs;
	orderMap[group.value] = group.order;
});

export { groupMap, orderMap, groups };
