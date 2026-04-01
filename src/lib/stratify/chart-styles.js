/**
 * Chart style presets for Stratify.
 *
 * Each preset defines a colour palette (for series assignment),
 * typography, and Observable Plot style overrides.
 *
 * To add or modify presets, edit this file directly.
 */

/**
 * @typedef {Object} ChartStylePreset
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string[]} colours - Ordered palette for series assignment
 * @property {{ fontFamily: string, fontSize: string, titleFont: string, titleSize: string, titleWeight: string }} typography
 * @property {{ background: string, gridStroke: string, axisStroke: string, ruleStroke: string }} chart
 */

/** @type {ChartStylePreset[]} */
export const CHART_STYLE_PRESETS = [
	{
		id: 'oe',
		name: 'Open Electricity',
		description: 'DM Sans with fuel tech colours — matches Stratum charts',
		colours: [
			// Battery & Storage
			'#3245C9', // battery / storage discharging
			'#577CFF', // battery charging / storage charging
			// Bioenergy
			'#1D7A7A', // bioenergy / biomass
			'#4CB9B9', // bioenergy biogas
			// Coal
			'#25170C', // coal
			'#121212', // coal black
			'#744A26', // coal brown
			// Distillate / Oil
			'#E15C34', // distillate / oil
			// Gas
			'#E87809', // gas
			'#FDB462', // gas ccgt
			'#F1AB4B', // gas ccgt ccs
			'#FFCD96', // gas ocgt
			'#F9DCBC', // gas recip
			'#F48E1B', // gas steam
			'#B46813', // gas wcmg
			'#C75338', // gas hydrogen / nuclear
			// Hydro
			'#5EA0C0', // hydro
			'#88AFD0', // pumps
			// Solar
			'#FED500', // solar / solar utility
			'#FDB200', // solar thermal
			'#FFF58D', // solar rooftop
			// Wind
			'#2C7629', // wind
			'#53AD69', // wind offshore
			// Grid
			'#521986', // imports
			'#927BAD', // exports
			'#7F7F7F', // interconnector / demand response
			// Aggregated
			'#594929', // fossil fuels
			'#52A972', // renewables
			'#CFA7FF', // total loads
			'#251C00', // total sources
			// Other
			'#069FAF', // vre
			'#545353', // residual
			'#6A6A6A' // demand
		],
		typography: {
			fontFamily: '"DM Sans", sans-serif',
			fontSize: '11px',
			titleFont: '"DM Sans", sans-serif',
			titleSize: '14px',
			titleWeight: '600'
		},
		chart: {
			background: 'transparent',
			gridStroke: '#efefef',
			axisStroke: '#33333344',
			ruleStroke: '#353535'
		}
	},
	{
		id: 'default',
		name: 'Default',
		description: 'Clean monospace with Tableau 10 colours',
		colours: [
			'#4e79a7',
			'#f28e2b',
			'#e15759',
			'#76b7b2',
			'#59a14f',
			'#edc948',
			'#b07aa1',
			'#ff9da7',
			'#9c755f',
			'#bab0ac'
		],
		typography: {
			fontFamily: 'DM Mono, monospace',
			fontSize: '10px',
			titleFont: 'DM Mono, monospace',
			titleSize: '14px',
			titleWeight: '600'
		},
		chart: {
			background: 'transparent',
			gridStroke: '#e5e5e5',
			axisStroke: '#888',
			ruleStroke: '#888'
		}
	},
	{
		id: 'warm-earth',
		name: 'Warm Earth',
		description: 'Earthy tones with serif typography',
		colours: [
			'#a65628',
			'#e6a532',
			'#4a7c59',
			'#8c6d4f',
			'#d45d35',
			'#7a9e7e',
			'#c9a96e',
			'#6b4c3b',
			'#b8860b',
			'#556b2f'
		],
		typography: {
			fontFamily: 'Georgia, "Times New Roman", serif',
			fontSize: '11px',
			titleFont: 'Georgia, "Times New Roman", serif',
			titleSize: '15px',
			titleWeight: '700'
		},
		chart: {
			background: 'transparent',
			gridStroke: '#ddd5c8',
			axisStroke: '#8b7d6b',
			ruleStroke: '#8b7d6b'
		}
	},
	{
		id: 'cool-slate',
		name: 'Cool Slate',
		description: 'Blue-grey palette with sans-serif type',
		colours: [
			'#3a6ea5',
			'#6b9bc3',
			'#2e4057',
			'#8cb4d5',
			'#1b3a4b',
			'#a3c4dc',
			'#4a7fa5',
			'#5a8fad',
			'#7aaec9',
			'#345e80'
		],
		typography: {
			fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
			fontSize: '11px',
			titleFont: '"Helvetica Neue", Helvetica, Arial, sans-serif',
			titleSize: '14px',
			titleWeight: '600'
		},
		chart: {
			background: 'transparent',
			gridStroke: '#dce3ea',
			axisStroke: '#7a8a99',
			ruleStroke: '#7a8a99'
		}
	},
	{
		id: 'vibrant',
		name: 'Vibrant',
		description: 'High-contrast saturated palette',
		colours: [
			'#e6194b',
			'#3cb44b',
			'#4363d8',
			'#f58231',
			'#911eb4',
			'#42d4f4',
			'#f032e6',
			'#bfef45',
			'#fabed4',
			'#469990'
		],
		typography: {
			fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
			fontSize: '11px',
			titleFont: '"Inter", "Segoe UI", system-ui, sans-serif',
			titleSize: '15px',
			titleWeight: '700'
		},
		chart: {
			background: 'transparent',
			gridStroke: '#e0e0e0',
			axisStroke: '#666',
			ruleStroke: '#666'
		}
	},
	{
		id: 'muted-pastel',
		name: 'Muted Pastel',
		description: 'Soft desaturated tones with light type',
		colours: [
			'#8da0cb',
			'#fc8d62',
			'#66c2a5',
			'#e78ac3',
			'#a6d854',
			'#ffd92f',
			'#e5c494',
			'#b3b3b3',
			'#7fc97f',
			'#beaed4'
		],
		typography: {
			fontFamily: '"Source Sans 3", "Source Sans Pro", sans-serif',
			fontSize: '11px',
			titleFont: '"Source Sans 3", "Source Sans Pro", sans-serif',
			titleSize: '15px',
			titleWeight: '600'
		},
		chart: {
			background: 'transparent',
			gridStroke: '#ececec',
			axisStroke: '#aaa',
			ruleStroke: '#aaa'
		}
	}
];

/** @type {Record<string, ChartStylePreset>} */
export const PRESETS_BY_ID = Object.fromEntries(CHART_STYLE_PRESETS.map((p) => [p.id, p]));

/**
 * Get a preset by ID, falling back to 'default'.
 * @param {string} id
 * @returns {ChartStylePreset}
 */
export function getPreset(id) {
	return PRESETS_BY_ID[id] ?? PRESETS_BY_ID['oe'];
}

/**
 * Assign colours to series names from a preset's palette.
 * @param {string[]} seriesNames
 * @param {string} presetId
 * @returns {Record<string, string>}
 */
export function assignPresetColours(seriesNames, presetId) {
	const preset = getPreset(presetId);
	return Object.fromEntries(
		seriesNames.map((name, i) => [name, preset.colours[i % preset.colours.length]])
	);
}

/**
 * Build an Observable Plot `style` object from a preset.
 * @param {string} presetId
 * @returns {{ fontFamily: string, fontSize: string, background: string, overflow: string }}
 */
export function getPlotStyle(presetId) {
	const preset = getPreset(presetId);
	return {
		fontFamily: preset.typography.fontFamily,
		fontSize: preset.typography.fontSize,
		background: preset.chart.background,
		overflow: 'visible'
	};
}
