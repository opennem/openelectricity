import { color } from 'd3-color';

/**
 * @param {string} colorString
 */
export default function darken(colorString, amount = 0.5) {
	// @ts-ignore
	return colorString ? color(colorString).darker(amount).formatHex() : 'transparent';
}

/**
 * Parse a `#rrggbb` (or `rrggbb`) hex string into an `[r, g, b]` triple
 * (0–255). Used for deck.gl layers, which take colours as RGB arrays.
 *
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function hexToRgb(hex) {
	const stripped = hex.replace('#', '');
	return [
		parseInt(stripped.slice(0, 2), 16),
		parseInt(stripped.slice(2, 4), 16),
		parseInt(stripped.slice(4, 6), 16)
	];
}
