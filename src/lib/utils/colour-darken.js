import { color } from 'd3-color';

/**
 * @param {string} colorString
 */
export default function darken(colorString, amount = 0.5) {
	// @ts-ignore
	return colorString ? color(colorString).darker(amount).formatHex() : 'transparent';
}
