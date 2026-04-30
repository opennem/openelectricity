import chroma from 'chroma-js';

/** @type {Record<string, { label: string, colour: string }>} */
export const CATEGORY_META = {
	air_pollutant: { label: 'Air Pollutants', colour: '#E07A5F' },
	water_pollutant: { label: 'Water Pollutants', colour: '#3D85C6' },
	heavy_metal: { label: 'Heavy Metals', colour: '#4A7A6B' },
	organic: { label: 'Organics', colour: '#F2CC8F' }
};

/**
 * Generate a colour palette for pollutants within a category
 * @param {string} categoryKey
 * @param {number} count
 * @returns {string[]}
 */
export function getCategoryPalette(categoryKey, count) {
	const base = CATEGORY_META[categoryKey]?.colour ?? '#888';
	if (count <= 1) return [base];
	return chroma.scale([chroma(base).brighten(1), chroma(base).darken(1)]).colors(count);
}
