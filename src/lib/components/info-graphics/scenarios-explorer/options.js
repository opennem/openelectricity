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
		label: 'Generation (TWh)',
		description: 'Energy Generation (TWh) by Financial Year'
	},
	{
		value: 'capacity',
		label: 'Capacity (GW)',
		description: 'Capacity (GW) by Financial Year'
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
	{
		value: 'scenario',
		label: 'By Scenario'
	},
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

export const modelPathways = {
	aemo2024: [
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
		'CDP11 (ODP)',
		'CDP12',
		'CDP13',
		'CDP14',
		'CDP15',
		'CDP16',
		'CDP17',
		'Counterfactual',
		'Least-cost DP'
	],
	aemo2022: [
		'CDP2',
		'CDP5',
		'CDP6',
		'CDP8',
		'CDP9',
		'CDP10',
		'CDP11',
		'CDP12',
		'CDP13',
		'Counterfactual'
	]
};

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

export const allScenarios = [
	{
		id: 'aemo2024-step-change',
		model: 'aemo2024',
		organisation: 'AEMO',
		year: 2024,
		draft: false,
		scenario: 'Step Change',
		scenarioId: 'step_change',
		pathways: [...modelPathways.aemo2024],
		defaultPathway: defaultModelPathway.aemo2024,
		colour: '#A078D7'
	},
	{
		id: 'aemo2024-progressive-change',
		model: 'aemo2024',
		organisation: 'AEMO',
		year: 2024,
		draft: false,
		scenario: 'Progressive Change',
		scenarioId: 'progressive_change',
		pathways: [...modelPathways.aemo2024],
		defaultPathway: defaultModelPathway.aemo2024,
		colour: '#F480EE'
	},
	{
		id: 'aemo2024-green-energy-exports',
		model: 'aemo2024',
		organisation: 'AEMO',
		year: 2024,
		draft: false,
		scenario: 'Green Energy Exports',
		scenarioId: 'green_energy_exports',
		pathways: [...modelPathways.aemo2024],
		defaultPathway: defaultModelPathway.aemo2024,
		colour: '#069FAF'
	},
	{
		id: 'aemo2022-step-change',
		model: 'aemo2022',
		organisation: 'AEMO',
		year: 2022,
		draft: false,
		scenario: 'Step Change',
		scenarioId: 'step_change',
		pathways: [...modelPathways.aemo2022],
		defaultPathway: defaultModelPathway.aemo2022,
		colour: '#BDBCBC'
	},
	{
		id: 'aemo2022-slow-change',
		model: 'aemo2022',
		organisation: 'AEMO',
		year: 2022,
		draft: false,
		scenario: 'Slow Change',
		scenarioId: 'slow_change',
		pathways: [...modelPathways.aemo2022],
		defaultPathway: defaultModelPathway.aemo2022,
		colour: '#545353'
	},
	{
		id: 'aemo2022-progressive-change',
		model: 'aemo2022',
		organisation: 'AEMO',
		year: 2022,
		draft: false,
		scenario: 'Progressive Change',
		scenarioId: 'progressive_change',
		pathways: [...modelPathways.aemo2022],
		defaultPathway: defaultModelPathway.aemo2022,
		colour: '#E78114'
	},
	{
		id: 'aemo2022-hydrogen-superpower',
		model: 'aemo2022',
		organisation: 'AEMO',
		year: 2022,
		draft: false,
		scenario: 'Hydrogen Superpower',
		scenarioId: 'hydrogen_superpower',
		pathways: [...modelPathways.aemo2022],
		defaultPathway: defaultModelPathway.aemo2022,
		colour: '#4F5FD7'
	}
];
