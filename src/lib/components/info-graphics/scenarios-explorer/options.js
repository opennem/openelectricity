import { startOfYear } from 'date-fns';

export const modelOptions = [
	{
		value: 'aemo2026draft',
		label: 'AEMO 2026 ISP (Draft)',
		description: "AEMO's 2026 Integrated System Plan (Draft)"
	},
	{
		value: 'aemo2024',
		label: 'AEMO 2024 ISP',
		description: "AEMO's 2024 Integrated System Plan"
	},
	{
		value: 'aemo2022',
		label: 'AEMO 2022 ISP',
		description: "AEMO's 2022 Integrated System Plan"
	},
	{
		value: 'aemo2020',
		label: 'AEMO 2020 ISP',
		description: "AEMO's 2020 Integrated System Plan"
	},
	{
		value: 'aemo2018',
		label: 'AEMO 2018 ISP',
		description: "AEMO's 2018 Integrated System Plan"
	}
];

export const dataViewOptions = [
	{
		value: 'energy',
		label: 'Generation',
		longLabel: 'Energy Generation',
		units: 'TWh',
		intervalLabel: 'by Financial Year',
		description: 'Energy Generation (TWh) by Financial Year'
	},

	{
		value: 'emissions',
		label: 'Emissions',
		longLabel: 'Emissions',
		units: 'MtCO₂e',
		intervalLabel: 'by Financial Year',
		description: 'Emissions (MtCO₂e) by Financial Year'
	},

	{
		value: 'capacity',
		label: 'Capacity',
		longLabel: 'Generation Capacity',
		units: 'GW',
		intervalLabel: 'by Financial Year',
		description: 'Capacity (GW) by Financial Year'
	}
];
/** @type {Record<string, string>} */
export const dataViewDescription = dataViewOptions.reduce(
	(/** @type {Record<string, string>} */ acc, curr) => ((acc[curr.value] = curr.description), acc),
	/** @type {Record<string, string>} */ ({})
);
/** @type {Record<string, string>} */
export const dataViewlabel = dataViewOptions.reduce(
	(/** @type {Record<string, string>} */ acc, curr) => ((acc[curr.value] = curr.label), acc),
	/** @type {Record<string, string>} */ ({})
);
/** @type {Record<string, string>} */
export const dataViewUnits = dataViewOptions.reduce(
	(/** @type {Record<string, string>} */ acc, curr) => ((acc[curr.value] = curr.units), acc),
	/** @type {Record<string, string>} */ ({})
);
/** @type {Record<string, string>} */
export const dataViewLongLabel = dataViewOptions.reduce(
	(/** @type {Record<string, string>} */ acc, curr) => ((acc[curr.value] = curr.longLabel), acc),
	/** @type {Record<string, string>} */ ({})
);
/** @type {Record<string, string>} */
export const dataViewIntervalLabel = dataViewOptions.reduce(
	(/** @type {Record<string, string>} */ acc, curr) => ((acc[curr.value] = curr.intervalLabel), acc),
	/** @type {Record<string, string>} */ ({})
);

/** @type {Object.<string, Date[]>} */
export const xTicks = {
	aemo2026draft: [
		startOfYear(new Date('2011-01-01')),
		startOfYear(new Date('2026-01-01')),
		startOfYear(new Date('2038-01-01')),
		startOfYear(new Date('2052-01-01'))
	],
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
	],
	aemo2020: [
		startOfYear(new Date('2011-01-01')),
		startOfYear(new Date('2021-01-01')),
		startOfYear(new Date('2032-01-01')),
		startOfYear(new Date('2043-01-01'))
	],
	aemo2018: [
		startOfYear(new Date('2011-01-01')),
		startOfYear(new Date('2018-01-01')),
		startOfYear(new Date('2030-01-01')),
		startOfYear(new Date('2041-01-01'))
	]
};

export const regionOptions = [
	{
		value: '_all',
		label: 'All Regions',
		description: 'National Electricity Market',
		colour: '#e34a33'
	},
	{
		value: 'nsw1',
		label: 'New South Wales',
		description: 'New South Wales',
		colour: '#A078D7' // 49A4E8
	},
	{
		value: 'qld1',
		label: 'Queensland',
		description: 'Queensland',
		colour: '#F480EE' // DC3A33
	},
	{
		value: 'sa1',
		label: 'South Australia',
		description: 'South Australia',
		colour: '#069FAF' // f7c41d
	},
	{
		value: 'tas1',
		label: 'Tasmania',
		description: 'Tasmania',
		colour: '#E78114' // 65C7AA
	},
	{
		value: 'vic1',
		label: 'Victoria',
		description: 'Victoria',
		colour: '#4F5FD7' // 153BA5
	}
];
export const regionsOnly = regionOptions.map((/** @type {any} */ d) => d.value).slice(1);
/** @type {Record<string, string>} */
export const regionsOnlyWithColours = regionOptions.reduce(
	(/** @type {Record<string, string>} */ acc, curr) => ((acc[curr.value] = curr.colour), acc),
	/** @type {Record<string, string>} */ ({})
);
/** @type {Record<string, string>} */
export const regionsOnlyWithLabels = regionOptions.reduce(
	(/** @type {Record<string, string>} */ acc, curr) => ((acc[curr.value] = curr.label), acc),
	/** @type {Record<string, string>} */ ({})
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
	aemo2026draft: [
		'CDP1',
		'CDP2',
		'CDP3',
		'CDP4 (ODP)',
		'CDP5',
		'CDP6',
		'CDP7',
		'CDP8',
		'CDP9',
		'CDP10',
		'CDP11',
		'CDP12',
		'CDP13',
		'CDP14',
		'CDP15',
		'CDP16',
		'CDP17',
		'CDP18',
		'CDP19',
		'CDP20',
		'CDP21',
		'CDP22',
		'CDP23',
		'Counterfactual'
	],

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
		'CDP11',
		'CDP12',
		'CDP13',
		'CDP14',
		'CDP15',
		'CDP16',
		'CDP17',
		'CDP18',
		'CDP19',
		'CDP20',
		'CDP21',
		'CDP22',
		'CDP23',
		'CDP24',
		'CDP25',
		'Counterfactual'
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
	],

	aemo2020: [
		'DP1',
		'DP2',
		'DP3',
		'DP4',
		'DP5',
		'DP6',
		'DP7',
		'DP8'
	],

	aemo2018: ['default']
};

// Optimal Path
/** @type {*} */
export const defaultModelPathway = {
	aemo2026draft: 'CDP4 (ODP)',
	aemo2024: 'CDP14',
	aemo2022: 'CDP12',
	aemo2020: 'DP4',
	aemo2018: 'default'
};
export const defaultPathwayOrder = [
	'CDP1',
	'CDP2',
	'CDP3',
	'CDP4',
	'CDP4 (ODP)',
	'CDP5',
	'CDP6',
	'CDP7',
	'CDP8',
	'CDP9',
	'CDP10',
	'CDP11',
	'CDP12',
	'CDP13',
	'CDP14',
	'CDP15',
	'CDP16',
	'CDP17',
	'CDP18',
	'CDP19',
	'CDP20',
	'CDP21',
	'CDP22',
	'CDP23',
	'CDP24',
	'CDP25',
	'Counterfactual',
	'DP1',
	'DP2',
	'DP3',
	'DP4',
	'DP5',
	'DP6',
	'DP7',
	'DP8',
	'default'
];

export const allScenarios = [
	{
		id: 'aemo2026draft-step_change',
		model: 'aemo2026draft',
		organisation: 'AEMO',
		year: 2026,
		draft: true,
		scenario: 'Step Change',
		scenarioId: 'step_change',
		pathways: [...modelPathways.aemo2026draft],
		defaultPathway: defaultModelPathway.aemo2026draft,
		colour: '#A078D7'
	},
	{
		id: 'aemo2026draft-accelerated_transition',
		model: 'aemo2026draft',
		organisation: 'AEMO',
		year: 2026,
		draft: true,
		scenario: 'Accelerated Transition',
		scenarioId: 'accelerated_transition',
		pathways: [...modelPathways.aemo2026draft],
		defaultPathway: defaultModelPathway.aemo2026draft,
		colour: '#F480EE'
	},
	{
		id: 'aemo2026draft-slower_growth',
		model: 'aemo2026draft',
		organisation: 'AEMO',
		year: 2026,
		draft: true,
		scenario: 'Slower Growth',
		scenarioId: 'slower_growth',
		pathways: [...modelPathways.aemo2026draft],
		defaultPathway: defaultModelPathway.aemo2026draft,
		colour: '#069FAF'
	},

	{
		id: 'aemo2024-step_change',
		model: 'aemo2024',
		organisation: 'AEMO',
		year: 2024,
		draft: false,
		scenario: 'Step Change',
		scenarioId: 'step_change',
		pathways: [...modelPathways.aemo2024],
		defaultPathway: defaultModelPathway.aemo2024,
		colour: '#E78114'
	},
	{
		id: 'aemo2024-progressive_change',
		model: 'aemo2024',
		organisation: 'AEMO',
		year: 2024,
		draft: false,
		scenario: 'Progressive Change',
		scenarioId: 'progressive_change',
		pathways: [...modelPathways.aemo2024],
		defaultPathway: defaultModelPathway.aemo2024,
		colour: '#4F5FD7'
	},
	{
		id: 'aemo2024-green_energy_exports',
		model: 'aemo2024',
		organisation: 'AEMO',
		year: 2024,
		draft: false,
		scenario: 'Green Energy Exports',
		scenarioId: 'green_energy_exports',
		pathways: [...modelPathways.aemo2024],
		defaultPathway: defaultModelPathway.aemo2024,
		colour: '#545353'
	},

	{
		id: 'aemo2022-step_change',
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
		id: 'aemo2022-slow_change',
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
		id: 'aemo2022-progressive_change',
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
		id: 'aemo2022-hydrogen_superpower',
		model: 'aemo2022',
		organisation: 'AEMO',
		year: 2022,
		draft: false,
		scenario: 'Hydrogen Superpower',
		scenarioId: 'hydrogen_superpower',
		pathways: [...modelPathways.aemo2022],
		defaultPathway: defaultModelPathway.aemo2022,
		colour: '#4F5FD7'
	},

	{
		id: 'aemo2020-step_change',
		model: 'aemo2020',
		organisation: 'AEMO',
		year: 2020,
		draft: false,
		scenario: 'Step Change',
		scenarioId: 'step_change',
		pathways: [...modelPathways.aemo2020],
		defaultPathway: defaultModelPathway.aemo2020,
		colour: '#A078D7'
	},
	{
		id: 'aemo2020-slow_change',
		model: 'aemo2020',
		organisation: 'AEMO',
		year: 2020,
		draft: false,
		scenario: 'Slow Change',
		scenarioId: 'slow_change',
		pathways: [...modelPathways.aemo2020],
		defaultPathway: defaultModelPathway.aemo2020,
		colour: '#F480EE'
	},
	{
		id: 'aemo2020-central',
		model: 'aemo2020',
		organisation: 'AEMO',
		year: 2020,
		draft: false,
		scenario: 'Central',
		scenarioId: 'central',
		pathways: [...modelPathways.aemo2020],
		defaultPathway: defaultModelPathway.aemo2020,
		colour: '#069FAF'
	},

	{
		id: 'aemo2018-neutral',
		model: 'aemo2018',
		organisation: 'AEMO',
		year: 2018,
		draft: false,
		scenario: 'Neutral',
		scenarioId: 'neutral',
		pathways: [...modelPathways.aemo2018],
		defaultPathway: defaultModelPathway.aemo2018,
		colour: '#BDBCBC'
	},
	{
		id: 'aemo2018-neutral_with_storage',
		model: 'aemo2018',
		organisation: 'AEMO',
		year: 2018,
		draft: false,
		scenario: 'Neutral with Storage',
		scenarioId: 'neutral_with_storage',
		pathways: [...modelPathways.aemo2018],
		defaultPathway: defaultModelPathway.aemo2018,
		colour: '#545353'
	},
	{
		id: 'aemo2018-fast',
		model: 'aemo2018',
		organisation: 'AEMO',
		year: 2018,
		draft: false,
		scenario: 'Fast',
		scenarioId: 'fast',
		pathways: [...modelPathways.aemo2018],
		defaultPathway: defaultModelPathway.aemo2018,
		colour: '#E78114'
	},
	{
		id: 'aemo2018-slow',
		model: 'aemo2018',
		organisation: 'AEMO',
		year: 2018,
		draft: false,
		scenario: 'Slow',
		scenarioId: 'slow',
		pathways: [...modelPathways.aemo2018],
		defaultPathway: defaultModelPathway.aemo2018,
		colour: '#4F5FD7'
	},
	{
		id: 'aemo2018-high_der',
		model: 'aemo2018',
		organisation: 'AEMO',
		year: 2018,
		draft: false,
		scenario: 'High DER',
		scenarioId: 'high_der',
		pathways: [...modelPathways.aemo2018],
		defaultPathway: defaultModelPathway.aemo2018,
		colour: '#A078D7'
	},
	{
		id: 'aemo2018-irfg',
		model: 'aemo2018',
		organisation: 'AEMO',
		year: 2018,
		draft: false,
		scenario: 'IRFG',
		scenarioId: 'irfg',
		pathways: [...modelPathways.aemo2018],
		defaultPathway: defaultModelPathway.aemo2018,
		colour: '#F480EE'
	}
];
