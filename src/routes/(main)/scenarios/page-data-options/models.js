import secondaryColourPalette from '$lib/theme/secondary-colour-palette';

/**
 * How to define the model scenarios and pathways
 * - set constants for the model names
 * - define the model logo paths
 * - define the scenarios for each model
 * - define the pathways for each model
 * - define the default pathway for each model
 * - define the model options
 * - define the scenario options
 * - set the secondary colours for the scenarios
 * - set the default pathway
 * - set the default model, scenario and pathway order
 */

export const AEMO_2026_ISP_DRAFT = 'aemo2026draft';
export const AEMO_2024_ISP = 'aemo2024';
export const AEMO_2024_ISP_DRAFT = 'aemo2024draft';
export const AEMO_2022_ISP = 'aemo2022';
export const AEMO_2022_ISP_DRAFT = 'aemo2022draft';
export const AEMO_2020_ISP = 'aemo2020';
export const AEMO_2020_ISP_DRAFT = 'aemo2020draft';
export const AEMO_2018_ISP = 'aemo2018';

export const modelLogoPath = {
	AEMO: '/img/model-providers/aemo-logo.png' // https://gel.aemo.com.au/docs/branding/logo
};

// also the order of the models and scenarios
export const modelScenarios = {
	[AEMO_2026_ISP_DRAFT]: [
		{ id: 'step_change', label: 'Step Change' },
		{ id: 'accelerated_transition', label: 'Accelerated Transition' },
		{ id: 'slower_growth', label: 'Slower Growth' }
	],
	[AEMO_2024_ISP]: [
		{ id: 'step_change', label: 'Step Change' },
		{ id: 'progressive_change', label: 'Progressive Change' },
		{ id: 'green_energy_exports', label: 'Green Energy Exports' }
	],
	[AEMO_2024_ISP_DRAFT]: [
		{ id: 'step_change', label: 'Step Change' },
		{ id: 'progressive_change', label: 'Progressive Change' },
		{ id: 'green_energy_exports', label: 'Green Energy Exports' }
	],
	[AEMO_2022_ISP]: [
		{ id: 'step_change', label: 'Step Change' },
		{ id: 'slow_change', label: 'Slow Change' },
		{ id: 'progressive_change', label: 'Progressive Change' },
		{ id: 'hydrogen_superpower', label: 'Hydrogen Superpower' }
	],
	[AEMO_2022_ISP_DRAFT]: [
		{ id: 'step_change', label: 'Step Change' },
		{ id: 'slow_change', label: 'Slow Change' },
		{ id: 'progressive_change', label: 'Progressive Change' },
		{ id: 'hydrogen_superpower', label: 'Hydrogen Superpower' }
	],
	[AEMO_2020_ISP]: [
		{ id: 'step_change', label: 'Step Change' },
		{ id: 'slow_change', label: 'Slow Change' },
		{ id: 'central', label: 'Central' }
	],
	[AEMO_2020_ISP_DRAFT]: [
		{ id: 'step', label: 'Step' },
		{ id: 'fast', label: 'Fast' },
		{ id: 'slow', label: 'Slow' },
		{ id: 'central', label: 'Central' },
		{ id: 'high_der', label: 'High DER' }
	],
	[AEMO_2018_ISP]: [
		{ id: 'neutral', label: 'Neutral' },
		{ id: 'neutral_with_storage', label: 'Neutral with Storage' },
		{ id: 'fast', label: 'Fast' },
		{ id: 'slow', label: 'Slow' },
		{ id: 'high_der', label: 'High DER' },
		{ id: 'irfg', label: 'IRFG' }
	]
};

export const modelPathways = {
	[AEMO_2026_ISP_DRAFT]: [
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

	[AEMO_2024_ISP]: [
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

	[AEMO_2024_ISP_DRAFT]: [
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
		'Counterfactual'
	],

	[AEMO_2022_ISP]: [
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

	[AEMO_2022_ISP_DRAFT]: [
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
		'Counterfactual'
	],

	[AEMO_2020_ISP]: [
		'DP1',
		'DP2',
		'DP3',
		'DP4',
		'DP5',
		'DP6',
		'DP7',
		'DP8'
	],

	[AEMO_2020_ISP_DRAFT]: ['default'],

	[AEMO_2018_ISP]: ['default']
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

// Optimal Path
/** @type {*} */
export const defaultModelPathway = {
	[AEMO_2026_ISP_DRAFT]: 'CDP4 (ODP)',
	[AEMO_2024_ISP]: 'CDP14',
	[AEMO_2024_ISP_DRAFT]: 'CDP3',
	[AEMO_2022_ISP]: 'CDP12',
	[AEMO_2022_ISP_DRAFT]: 'CDP12',
	[AEMO_2020_ISP]: 'DP4',
	[AEMO_2020_ISP_DRAFT]: 'default',
	[AEMO_2018_ISP]: 'default'
};

/** @type {Record<string, string>} */
export const modelPaths = {
	[AEMO_2026_ISP_DRAFT]: '/data/scenarios/2026_ISP_draft',
	[AEMO_2024_ISP]: '/data/scenarios/2024_ISP_final',
	[AEMO_2024_ISP_DRAFT]: '/data/scenarios/2024_ISP_draft',
	[AEMO_2022_ISP]: '/data/scenarios/2022_ISP_final',
	[AEMO_2022_ISP_DRAFT]: '/data/scenarios/2022_ISP_draft',
	[AEMO_2020_ISP]: '/data/scenarios/2020_ISP_final',
	[AEMO_2020_ISP_DRAFT]: '/data/scenarios/2020_ISP_draft',
	[AEMO_2018_ISP]: '/data/scenarios/2018_ISP'
};

export const modelOptions = [
	{
		value: AEMO_2026_ISP_DRAFT,
		label: 'AEMO 2026 ISP (Draft)',
		description: "AEMO's 2026 Integrated System Plan (Draft)",
		organisation: 'AEMO',
		year: 2026,
		draft: true,
		scenarios: [
			...modelScenarios[AEMO_2026_ISP_DRAFT].map(({ id, label }) => ({
				id: `${AEMO_2026_ISP_DRAFT}-${id}`,
				model: AEMO_2026_ISP_DRAFT,
				value: id,
				label: label,
				colour: '#000'
			}))
		],
		pathways: [...modelPathways[AEMO_2026_ISP_DRAFT]],
		defaultPathway: defaultModelPathway[AEMO_2026_ISP_DRAFT]
	},
	{
		value: AEMO_2024_ISP,
		label: 'AEMO 2024 ISP (Final)',
		description: "AEMO's 2024 Integrated System Plan",
		organisation: 'AEMO',
		year: 2024,
		draft: false,
		scenarios: [
			...modelScenarios[AEMO_2024_ISP].map(({ id, label }) => ({
				id: `${AEMO_2024_ISP}-${id}`,
				model: AEMO_2024_ISP,
				value: id,
				label: label,
				colour: '#000'
			}))
		],
		pathways: [...modelPathways[AEMO_2024_ISP]],
		defaultPathway: defaultModelPathway[AEMO_2024_ISP]
	},
	{
		value: AEMO_2024_ISP_DRAFT,
		label: 'AEMO 2024 ISP (Draft)',
		description: "AEMO's 2024 Integrated System Plan (Draft)",
		organisation: 'AEMO',
		year: 2024,
		draft: true,
		scenarios: [
			...modelScenarios[AEMO_2024_ISP_DRAFT].map(({ id, label }) => ({
				id: `${AEMO_2024_ISP_DRAFT}-${id}`,
				model: AEMO_2024_ISP_DRAFT,
				value: id,
				label: label,
				colour: '#000'
			}))
		],
		pathways: [...modelPathways[AEMO_2024_ISP_DRAFT]],
		defaultPathway: defaultModelPathway[AEMO_2024_ISP_DRAFT]
	},
	{
		value: AEMO_2022_ISP,
		label: 'AEMO 2022 ISP (Final)',
		description: "AEMO's 2022 Integrated System Plan",
		organisation: 'AEMO',
		year: 2022,
		draft: false,
		scenarios: [...modelScenarios[AEMO_2022_ISP]].map(({ id, label }) => ({
			id: `${AEMO_2022_ISP}-${id}`,
			model: AEMO_2022_ISP,
			value: id,
			label: label,
			colour: '#000'
		})),
		pathways: [...modelPathways[AEMO_2022_ISP]],
		defaultPathway: defaultModelPathway[AEMO_2022_ISP]
	},
	{
		value: AEMO_2022_ISP_DRAFT,
		label: 'AEMO 2022 ISP (Draft)',
		description: "AEMO's 2022 Integrated System Plan (Draft)",
		organisation: 'AEMO',
		year: 2022,
		draft: true,
		scenarios: [...modelScenarios[AEMO_2022_ISP_DRAFT]].map(({ id, label }) => ({
			id: `${AEMO_2022_ISP_DRAFT}-${id}`,
			model: AEMO_2022_ISP_DRAFT,
			value: id,
			label: label,
			colour: '#000'
		})),
		pathways: [...modelPathways[AEMO_2022_ISP_DRAFT]],
		defaultPathway: defaultModelPathway[AEMO_2022_ISP_DRAFT]
	},
	{
		value: AEMO_2020_ISP,
		label: 'AEMO 2020 ISP (Final)',
		description: "AEMO's 2020 Integrated System Plan",
		organisation: 'AEMO',
		year: 2020,
		draft: false,
		scenarios: [...modelScenarios[AEMO_2020_ISP]].map(({ id, label }) => ({
			id: `${AEMO_2020_ISP}-${id}`,
			model: AEMO_2020_ISP,
			value: id,
			label: label,
			colour: '#000'
		})),
		pathways: [...modelPathways[AEMO_2020_ISP]],
		defaultPathway: defaultModelPathway[AEMO_2020_ISP]
	},
	{
		value: AEMO_2020_ISP_DRAFT,
		label: 'AEMO 2020 ISP (Draft)',
		description: "AEMO's 2020 Integrated System Plan (Draft)",
		organisation: 'AEMO',
		year: 2020,
		draft: true,
		scenarios: [...modelScenarios[AEMO_2020_ISP_DRAFT]].map(({ id, label }) => ({
			id: `${AEMO_2020_ISP_DRAFT}-${id}`,
			model: AEMO_2020_ISP_DRAFT,
			value: id,
			label: label,
			colour: '#000'
		})),
		pathways: [...modelPathways[AEMO_2020_ISP_DRAFT]],
		defaultPathway: defaultModelPathway[AEMO_2020_ISP_DRAFT]
	},
	{
		value: AEMO_2018_ISP,
		label: 'AEMO 2018 ISP',
		description: "AEMO's 2018 Integrated System Plan",
		organisation: 'AEMO',
		year: 2018,
		draft: false,
		scenarios: [...modelScenarios[AEMO_2018_ISP]].map(({ id, label }) => ({
			id: `${AEMO_2018_ISP}-${id}`,
			model: AEMO_2018_ISP,
			value: id,
			label: label,
			colour: '#000'
		})),
		pathways: [...modelPathways[AEMO_2018_ISP]],
		defaultPathway: defaultModelPathway[AEMO_2018_ISP]
	}
];

let colourIndex = 0;
const maxColours = secondaryColourPalette.length;
modelOptions.forEach((/** @type {any} */ model) => {
	model.scenarios.forEach((/** @type {any} */ scenario) => {
		scenario.colour = secondaryColourPalette[colourIndex % maxColours];
		colourIndex++;
	});
});

/** @type {any[]} */
export const scenarioOptions = modelOptions.reduce((/** @type {any[]} */ acc, /** @type {any} */ curr) => [...acc, ...curr.scenarios], /** @type {any[]} */ ([]));

// create a list of unique ids for every mutation of model, scenario and pathway
export const modelScenarioPathwayOptions = modelOptions.reduce((/** @type {any[]} */ acc, /** @type {any} */ model) => {
	model.scenarios.forEach((/** @type {any} */ scenario) => {
		model.pathways.forEach((/** @type {string} */ pathway) => {
			acc.push({
				id: `${model.value}-${scenario.value}-${pathway}`,
				model: model.value,
				scenario: scenario.value,
				pathway: pathway
			});
		});
	});
	return acc;
}, /** @type {any[]} */ ([]));

/** @type {Record<string, string>} */
export const modelLabelMap = modelOptions.reduce((/** @type {Record<string, string>} */ acc, /** @type {any} */ curr) => {
	acc[curr.value] = curr.label;
	return acc;
}, /** @type {Record<string, string>} */ ({}));

/** @type {Record<string, string>} */
export const scenarioColourMap = scenarioOptions.reduce((/** @type {Record<string, string>} */ acc, /** @type {any} */ curr) => {
	acc[curr.id] = curr.colour;
	return acc;
}, /** @type {Record<string, string>} */ ({}));

/** @type {Record<string, string>} */
export const scenarioLabelMap = scenarioOptions.reduce((/** @type {Record<string, string>} */ acc, /** @type {any} */ curr) => {
	acc[curr.id] = curr.label;
	return acc;
}, /** @type {Record<string, string>} */ ({}));
