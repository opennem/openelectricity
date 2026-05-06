/**
 * ColorBrewer-style palette definitions for Stratify.
 *
 * Three categories: qualitative, sequential, diverging.
 * Uses d3-scale-chromatic for standard palettes plus custom OE palettes.
 */

import {
	schemeTableau10,
	schemeSet1,
	schemeSet2,
	schemeSet3,
	schemePaired,
	schemeDark2,
	schemePastel1,
	schemePastel2,
	schemeAccent,
	interpolateBlues,
	interpolateGreens,
	interpolateOranges,
	interpolatePurples,
	interpolateReds,
	interpolateGreys,
	interpolateYlGn,
	interpolateYlOrRd,
	interpolateBuGn,
	interpolatePuBu,
	interpolateRdBu,
	interpolateRdYlGn,
	interpolateBrBG,
	interpolatePiYG,
	interpolatePRGn,
	interpolateRdYlBu,
	interpolateSpectral
} from 'd3-scale-chromatic';

/**
 * @typedef {'qualitative' | 'sequential' | 'diverging'} PaletteType
 */

/**
 * @typedef {Object} PaletteDefinition
 * @property {string} id
 * @property {string} name
 * @property {PaletteType} type
 * @property {string[] | ((n: number) => string[])} colours - Fixed array or function that returns N colours
 */

/** OE Energy palette — inspired by fuel tech colours */
const OE_ENERGY = [
	'#3245C9', // battery
	'#FED500', // solar
	'#2C7629', // wind
	'#25170C', // coal
	'#E87809', // gas
	'#5EA0C0', // hydro
	'#1D7A7A', // bioenergy
	'#E15C34', // distillate
	'#521986', // imports
	'#52A972', // renewables
	'#7F7F7F', // interconnector
	'#594929'  // fossil fuels
];

/** OE Secondary palette — supplementary qualitative palette */
const OE_SECONDARY = [
	'#545353',
	'#DE4E28',
	'#F480EE',
	'#069FAF',
	'#3245C9',
	'#BDBCBC',
	'#A078D7'
];

/**
 * Sample N evenly-spaced colours from a d3 interpolator.
 * @param {(t: number) => string} interpolator
 * @param {number} n
 * @returns {string[]}
 */
function sampleInterpolator(interpolator, n) {
	if (n === 1) return [interpolator(0.5)];
	return Array.from({ length: n }, (_, i) => interpolator(i / (n - 1)));
}

/** @type {PaletteDefinition[]} */
export const PALETTES = [
	// Qualitative
	{ id: 'oe-energy', name: 'OE Energy', type: 'qualitative', colours: OE_ENERGY },
	{ id: 'oe-secondary', name: 'OE Secondary', type: 'qualitative', colours: OE_SECONDARY },
	{ id: 'tableau10', name: 'Tableau 10', type: 'qualitative', colours: [...schemeTableau10] },
	{ id: 'set1', name: 'Set 1', type: 'qualitative', colours: [...schemeSet1] },
	{ id: 'set2', name: 'Set 2', type: 'qualitative', colours: [...schemeSet2] },
	{ id: 'set3', name: 'Set 3', type: 'qualitative', colours: [...schemeSet3] },
	{ id: 'paired', name: 'Paired', type: 'qualitative', colours: [...schemePaired] },
	{ id: 'dark2', name: 'Dark 2', type: 'qualitative', colours: [...schemeDark2] },
	{ id: 'pastel1', name: 'Pastel 1', type: 'qualitative', colours: [...schemePastel1] },
	{ id: 'pastel2', name: 'Pastel 2', type: 'qualitative', colours: [...schemePastel2] },
	{ id: 'accent', name: 'Accent', type: 'qualitative', colours: [...schemeAccent] },

	// Sequential
	{ id: 'blues', name: 'Blues', type: 'sequential', colours: (n) => sampleInterpolator(interpolateBlues, n) },
	{ id: 'greens', name: 'Greens', type: 'sequential', colours: (n) => sampleInterpolator(interpolateGreens, n) },
	{ id: 'oranges', name: 'Oranges', type: 'sequential', colours: (n) => sampleInterpolator(interpolateOranges, n) },
	{ id: 'purples', name: 'Purples', type: 'sequential', colours: (n) => sampleInterpolator(interpolatePurples, n) },
	{ id: 'reds', name: 'Reds', type: 'sequential', colours: (n) => sampleInterpolator(interpolateReds, n) },
	{ id: 'greys', name: 'Greys', type: 'sequential', colours: (n) => sampleInterpolator(interpolateGreys, n) },
	{ id: 'ylgn', name: 'Yellow-Green', type: 'sequential', colours: (n) => sampleInterpolator(interpolateYlGn, n) },
	{ id: 'ylorrd', name: 'Yellow-Orange-Red', type: 'sequential', colours: (n) => sampleInterpolator(interpolateYlOrRd, n) },
	{ id: 'bugn', name: 'Blue-Green', type: 'sequential', colours: (n) => sampleInterpolator(interpolateBuGn, n) },
	{ id: 'pubu', name: 'Purple-Blue', type: 'sequential', colours: (n) => sampleInterpolator(interpolatePuBu, n) },

	// Diverging
	{ id: 'rdbu', name: 'Red-Blue', type: 'diverging', colours: (n) => sampleInterpolator(interpolateRdBu, n) },
	{ id: 'rdylgn', name: 'Red-Yellow-Green', type: 'diverging', colours: (n) => sampleInterpolator(interpolateRdYlGn, n) },
	{ id: 'brbg', name: 'Brown-Teal', type: 'diverging', colours: (n) => sampleInterpolator(interpolateBrBG, n) },
	{ id: 'piyg', name: 'Pink-Green', type: 'diverging', colours: (n) => sampleInterpolator(interpolatePiYG, n) },
	{ id: 'prgn', name: 'Purple-Green', type: 'diverging', colours: (n) => sampleInterpolator(interpolatePRGn, n) },
	{ id: 'rdylbu', name: 'Red-Yellow-Blue', type: 'diverging', colours: (n) => sampleInterpolator(interpolateRdYlBu, n) },
	{ id: 'spectral', name: 'Spectral', type: 'diverging', colours: (n) => sampleInterpolator(interpolateSpectral, n) }
];

/** @type {Record<string, PaletteDefinition>} */
export const PALETTES_BY_ID = Object.fromEntries(PALETTES.map((p) => [p.id, p]));

/**
 * Get colours for a palette at a given class count.
 * @param {string} paletteId
 * @param {number} n - Number of colours needed
 * @returns {string[]}
 */
export function getPaletteColours(paletteId, n) {
	const palette = PALETTES_BY_ID[paletteId];
	if (!palette) return getPaletteColours('oe-energy', n);

	if (typeof palette.colours === 'function') {
		return palette.colours(n);
	}

	// For fixed arrays, take first N or cycle
	if (n <= palette.colours.length) {
		return palette.colours.slice(0, n);
	}
	return Array.from({ length: n }, (_, i) => palette.colours[i % palette.colours.length]);
}

/**
 * Get the unique colour swatches for a palette — for the colour-picker UI,
 * which should never show repeated colours when the palette is shorter than
 * the requested count. Sequential/diverging palettes are sampled at `max`.
 * @param {string} paletteId
 * @param {number} [max]
 * @returns {string[]}
 */
export function getPaletteSwatchColours(paletteId, max = 12) {
	const palette = PALETTES_BY_ID[paletteId];
	if (!palette) return getPaletteSwatchColours('oe-energy', max);
	if (typeof palette.colours === 'function') return palette.colours(max);
	return palette.colours.slice(0, max);
}

/**
 * Assign palette colours to series names.
 * @param {string[]} seriesNames
 * @param {string} paletteId
 * @returns {Record<string, string>}
 */
export function assignPaletteColours(seriesNames, paletteId) {
	const colours = getPaletteColours(paletteId, seriesNames.length);
	return Object.fromEntries(seriesNames.map((name, i) => [name, colours[i]]));
}

/**
 * Migrate old preset ID to a palette ID.
 * @param {string} presetId
 * @returns {string}
 */
export function migratePresetToPalette(presetId) {
	/** @type {Record<string, string>} */
	const map = {
		oe: 'oe-energy',
		default: 'tableau10',
		'warm-earth': 'set2',
		'cool-slate': 'blues',
		vibrant: 'set1',
		'muted-pastel': 'pastel1'
	};
	return map[presetId] ?? 'oe-energy';
}
