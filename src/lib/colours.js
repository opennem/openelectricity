import chroma from 'chroma-js';
const { scale, contrast } = chroma;

export const spectrum = {
	intensity: ['#52A972', '#9ED48B', '#E9FFAA', '#A6A36F', '#594929'],
	price: ['#F2F1EE', '#D1D0CD', '#B0B0AE', '#91918F', '#737372', '#565655', '#3B3B3B', '#222222']
};

/** @typedef {import('chroma-js').Color} Color */

/**
 * @param {number} max
 * @returns {import("chroma-js").Scale}
 */
export const createIntensityScale = (max) => scale(spectrum.intensity).domain([0, max]);

/**
 * @param {number} max
 * @returns {import("chroma-js").Scale}
 */
export const createPriceScale = (max) =>
	scale(spectrum.price).domain([0, max]).classes(spectrum.price.length);

const minContrastRatio = 3;
const white = chroma('white');
const black = chroma('black');

/**
 * Returns either black or white depending on which has the highest contrast ratio
 * @param {Color} colour
 * @returns {Color}
 */
export const getContrastedTextColour = (colour) => {
	const contrastRatio = contrast(colour, white);
	return contrastRatio >= minContrastRatio ? white : black;
};
