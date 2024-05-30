import { startOfYear } from 'date-fns';

export const modelOptions = [
	{
		value: 'aemo2024',
		label: 'AEMO Draft 2024 ISP',
		description: "AEMO's Draft 2024 Integrated System Plan"
	},
	{
		value: 'aemo2022',
		label: 'AEMO 2022 ISP',
		description: "AEMO's 2022 Integrated System Plan"
	}
];

export const dataViewOptions = [
	{
		value: 'energy',
		label: 'Energy (TWh)',
		description: 'Energy Generation (TWh) by Financial Year'
	},
	{
		value: 'capacity',
		label: 'Capacity (TW)',
		description: 'Capacity (TW) by Financial Year'
	}
];
export const dataViewDescription = dataViewOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.description), acc),
	{}
);
export const dataViewlabel = dataViewOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.label), acc),
	{}
);

/** @type {Object.<string, Date[]>} */
export const xTicks = {
	aemo2024: [
		startOfYear(new Date('2011-01-01')),
		startOfYear(new Date('2025-01-01')),
		startOfYear(new Date('2038-01-01')),
		startOfYear(new Date('2052-01-01'))
	],
	aemo2022: [
		startOfYear(new Date('2011-01-01')),
		startOfYear(new Date('2024-01-01')),
		startOfYear(new Date('2037-01-01')),
		startOfYear(new Date('2051-01-01'))
	]
};

export const regionOptions = [
	{
		value: 'NEM',
		label: 'National Electricity Market',
		description: 'National Electricity Market',
		colour: '#e34a33'
	},
	{
		value: 'NSW1',
		label: 'New South Wales',
		description: 'New South Wales',
		colour: '#49A4E8'
	},
	{
		value: 'QLD1',
		label: 'Queensland',
		description: 'Queensland',
		colour: '#DC3A33'
	},
	{
		value: 'SA1',
		label: 'South Australia',
		description: 'South Australia',
		colour: '#f7c41d'
	},
	{
		value: 'TAS1',
		label: 'Tasmania',
		description: 'Tasmania',
		colour: '#65C7AA'
	},
	{
		value: 'VIC1',
		label: 'Victoria',
		description: 'Victoria',
		colour: '#153BA5'
	}
];
export const regionsOnly = regionOptions.map((d) => d.value).slice(1);
export const regionsOnlyWithColours = regionOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.colour), acc),
	{}
);
export const regionsOnlyWithLabels = regionOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.label), acc),
	{}
);

export const displayViewOptions = [
	{
		value: 'technology',
		label: 'By Technology'
	},
	// {
	// 	value: 'technology',
	// 	label: 'Technology'
	// },
	{
		value: 'region',
		label: 'By Region'
	}
];

export const chartTypeOptions = [
	{
		value: 'area',
		label: 'Area'
	},
	{
		value: 'line',
		label: 'Line'
	}
];

// Optimal Path
/** @type {*} */
export const defaultModelPathway = {
	aemo2024: 'CDP11 (ODP)',
	aemo2022: 'CDP12'
};
export const defaultPathwayOrder = [
	'CDP1',
	'CDP2',
	'CDP3',
	'CDP4',
	'CDP5',
	'CDP6',
	'CDP7',
	'CDP8',
	'CDP9',
	'CDP10',
	'CDP11',
	'CDP11 (ODP)',
	'CDP12',
	'CDP13',
	'CDP14',
	'CDP15',
	'CDP16',
	'CDP17',
	'Counterfactual',
	'Least-cost DP'
];
