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

export const AEMO_2022_ISP = 'aemo2022';
export const AEMO_2024_ISP = 'aemo2024';

export const modelLogoPath = {
	AEMO: '/img/model-providers/aemo-logo.png' // https://gel.aemo.com.au/docs/branding/logo
};

// also the order of the models and scenarios
export const modelScenarios = {
	[AEMO_2024_ISP]: [
		{ id: 'step_change', label: 'Step Change' },
		{ id: 'progressive_change', label: 'Progressive Change' },
		{ id: 'green_energy_exports', label: 'Green Energy Exports' }
	],
	[AEMO_2022_ISP]: [
		{ id: 'step_change', label: 'Step Change' },
		{ id: 'slow_change', label: 'Slow Change' },
		{ id: 'progressive_change', label: 'Progressive Change' },
		{ id: 'hydrogen_superpower', label: 'Hydrogen Superpower' }
	]
};

export const modelPathways = {
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
	]
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
];

// Optimal Path
/** @type {*} */
export const defaultModelPathway = {
	[AEMO_2024_ISP]: 'CDP14',
	[AEMO_2022_ISP]: 'CDP12'
};

export const modelOptions = [
	{
		value: AEMO_2024_ISP,
		label: 'AEMO 2024 ISP',
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
		value: AEMO_2022_ISP,
		label: 'AEMO 2022 ISP',
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
	}
];

let colourIndex = 0;
const maxColours = secondaryColourPalette.length;
modelOptions.forEach((model) => {
	model.scenarios.forEach((scenario) => {
		scenario.colour = secondaryColourPalette[colourIndex % maxColours];
		colourIndex++;
	});
});

/** @type {*} */
export const scenarioOptions = modelOptions.reduce((acc, curr) => [...acc, ...curr.scenarios], []);

// create a list of unique ids for every mutation of model, scenario and pathway
export const modelScenarioPathwayOptions = modelOptions.reduce((acc, model) => {
	model.scenarios.forEach((scenario) => {
		model.pathways.forEach((pathway) => {
			acc.push({
				id: `${model.value}-${scenario.value}-${pathway}`,
				model: model.value,
				scenario: scenario.value,
				pathway: pathway
			});
		});
	});
	return acc;
}, []);

export const modelLabelMap = modelOptions.reduce((acc, curr) => {
	acc[curr.value] = curr.label;
	return acc;
}, {});
export const scenarioColourMap = scenarioOptions.reduce((acc, curr) => {
	acc[curr.id] = curr.colour;
	return acc;
}, {});
export const scenarioLabelMap = scenarioOptions.reduce((acc, curr) => {
	acc[curr.id] = curr.label;
	return acc;
}, {});

// add secondary colours to scenarios
// let colourIndex = 0;
// let maxColours = secondaryColourPalette.length;

// scenarioOptions.forEach((scenario) => {
// 	scenario.colour = secondaryColourPalette[colourIndex % maxColours];
// 	colourIndex++;
// });
