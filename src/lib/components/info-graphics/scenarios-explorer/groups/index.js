import * as detailed from './detailed';
import * as simple from './simple';
import * as renewablesVsFossils from './renewables-vs-fossils';
import * as totals from './totals';
import * as totalSources from './total-sources';
import * as coalGas from './coal_gas';
import * as windSolar from './wind_solar';
import * as homepagePreview from './homepage-preview';
import * as homepageRenewablesVsFossils from './homepage-renewables-vs-fossils';

import * as coalOnly from './coal-only';
import * as gasOnly from './gas-only';
import * as solarOnly from './solar-only';
import * as windOnly from './wind-only';

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

export const coalOnlyGroup = {
	label: 'Coal',
	value: 'coal_only',
	fuelTechs: coalOnly.fuelTechMap,
	order: coalOnly.order,
	labels: coalOnly.labels
};
export const gasOnlyGroup = {
	label: 'Gas',
	value: 'gas_only',
	fuelTechs: gasOnly.fuelTechMap,
	order: gasOnly.order,
	labels: gasOnly.labels
};
export const solarOnlyGroup = {
	label: 'Solar',
	value: 'solar_only',
	fuelTechs: solarOnly.fuelTechMap,
	order: solarOnly.order,
	labels: solarOnly.labels
};
export const windOnlyGroup = {
	label: 'Wind',
	value: 'wind_only',
	fuelTechs: windOnly.fuelTechMap,
	order: windOnly.order,
	labels: windOnly.labels
};

export const groups = [
	simpleGroup,
	detailedGroup,
	renewablesVsFossilsGroup,
	totalsGroup,
	totalSourcesGroup,
	homepagePreviewGroup,
	homepageRenewablesVsFossilsGroup,
	coalGasGroup,
	windSolarGroup,
	coalOnlyGroup,
	gasOnlyGroup,
	solarOnlyGroup,
	windOnlyGroup
];

/** @type {*} */
export let groupMap = {};
/** @type {*} */
export let orderMap = {};

groups.forEach((group) => {
	groupMap[group.value] = group.fuelTechs;
	orderMap[group.value] = group.order;
});
