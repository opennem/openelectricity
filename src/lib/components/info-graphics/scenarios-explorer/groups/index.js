import * as detailed from './detailed';
import * as simple from './simple';
import * as renewablesVsFossils from './renewables-vs-fossils';
import * as totals from './totals';
import * as totalSources from './total-sources';
import * as coalGas from './coal_gas';
import * as windSolar from './wind_solar';
import * as homepagePreview from './homepage-preview';
import * as homepageRenewablesVsFossils from './homepage-renewables-vs-fossils';

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
export const totalSourcesGroup = {
	label: 'Total Sources',
	value: 'total_sources',
	fuelTechs: totalSources.fuelTechMap,
	order: totalSources.order,
	labels: totalSources.labels
};
export const homepagePreviewGroup = {
	label: 'Default',
	value: 'homepage_preview',
	fuelTechs: homepagePreview.fuelTechMap,
	order: homepagePreview.order,
	labels: homepagePreview.labels
};
export const homepageRenewablesVsFossilsGroup = {
	label: 'Renewables vs Fossil Fuels',
	value: 'homepage_renewables_vs_fossil_fuels',
	fuelTechs: homepageRenewablesVsFossils.fuelTechMap,
	order: homepageRenewablesVsFossils.order,
	labels: homepageRenewablesVsFossils.labels
};

export const groups = [
	simpleGroup,
	detailedGroup,
	renewablesVsFossilsGroup,
	totalsGroup,
	totalSourcesGroup,
	homepagePreviewGroup,
	homepageRenewablesVsFossilsGroup
];

/** @type {*} */
export let groupMap = {};
/** @type {*} */
export let orderMap = {};

groups.forEach((group) => {
	groupMap[group.value] = group.fuelTechs;
	orderMap[group.value] = group.order;
});
