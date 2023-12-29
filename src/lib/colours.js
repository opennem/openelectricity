import chroma, { scale } from 'chroma-js';

export const spectrum = {
	intensity: ['#52A972', '#9ED48B', '#E9FFAA', '#A6A36F', '#594929'],
	price: ['#F2F1EE', '#D1D0CD', '#B0B0AE', '#91918F', '#737372', '#565655', '#3B3B3B', '#222222']
};

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

const MIN_CONTRAST_RATIO = 5;
const WHITE = chroma('white');
const BLACK = chroma('black');

export const getContrastedTextColour = (colour) => {
	const contrastRatio = chroma.contrast(colour, WHITE);
	return contrastRatio >= MIN_CONTRAST_RATIO ? WHITE : BLACK;
};
