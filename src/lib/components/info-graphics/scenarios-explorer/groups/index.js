import * as detailed from './detailed';
import * as simple from './simple';
import * as renewablesVsFossils from './renewables-vs-fossils';
import * as totals from './totals';
import * as coalGas from './coal_gas';
import * as windSolar from './wind_solar';

export const detailedGroup = {
	label: 'Detailed',
	value: 'detailed',
	fuelTechs: detailed.fuelTechMap,
	order: detailed.order,
	labels: detailed.labels
};
export const simpleGroup = {
	label: 'Default',
	value: 'simple',
	fuelTechs: simple.fuelTechMap,
	order: simple.order,
	labels: simple.labels
};
export const renewablesVsFossilsGroup = {
	label: 'Renewables vs Fossil Fuels',
	value: 'renewables_vs_fossil_fuels',
	fuelTechs: renewablesVsFossils.fuelTechMap,
	order: renewablesVsFossils.order,
	labels: renewablesVsFossils.labels
};
export const totalsGroup = {
	label: 'Net Generation',
	value: 'totals',
	fuelTechs: totals.fuelTechMap,
	order: totals.order,
	labels: totals.labels
};
export const coalGasGroup = {
	label: 'Coal & Gas',
	value: 'coal_gas',
	fuelTechs: coalGas.fuelTechMap,
	order: coalGas.order,
	labels: coalGas.labels
};
export const windSolarGroup = {
	label: 'Wind & Solar',
	value: 'wind_solar',
	fuelTechs: windSolar.fuelTechMap,
	order: windSolar.order,
	labels: windSolar.labels
};

export const groups = [simpleGroup, detailedGroup, renewablesVsFossilsGroup, totalsGroup];

/** @type {*} */
export let groupMap = {};
/** @type {*} */
export let orderMap = {};

groups.forEach((group) => {
	groupMap[group.value] = group.fuelTechs;
	orderMap[group.value] = group.order;
});
