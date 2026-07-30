/**
 * Voltage bands for the transmission-lines layers — the single definition every
 * surface that draws or explains them reads from, so a colour can't be changed
 * in one and forgotten in another. Three consumers: the /facilities map, the
 * /facility/[code] detail map, and the /facilities map key.
 *
 * Ordered highest → lowest, matching the `case` expression's fall-through. (The
 * key displays them in reverse; only the map's expression depends on this order.)
 * `width` is the key's swatch weight — the layer's mid-zoom line widths nudged up
 * a step, since a hairline that reads fine across a map is too faint at 20px, and
 * the ladder is what has to survive, not the absolute value. Labels are bare kV
 * ranges: the key states the unit once, in its heading.
 *
 * `colour` is for the light basemap; `brightColour` is the legible-on-dark
 * variant, used by both the dark and satellite styles.
 *
 * @typedef {{
 *   key: 'high' | 'medium' | 'low' | 'lowest',
 *   label: string,
 *   min: number,
 *   colour: string,
 *   brightColour: string,
 *   width: number
 * }} TransmissionBand
 */

/** @type {readonly TransmissionBand[]} */
export const TRANSMISSION_BANDS = Object.freeze([
	{
		key: 'high',
		label: '400-500',
		min: 400,
		colour: '#c0392b',
		brightColour: '#ff6b6b',
		width: 5
	},
	{
		key: 'medium',
		label: '220-330',
		min: 220,
		colour: '#c49b00',
		brightColour: '#ffd93d',
		width: 4
	},
	{
		key: 'low',
		label: '110-132',
		min: 110,
		colour: '#27ae60',
		brightColour: '#6bcb77',
		width: 3
	},
	{
		key: 'lowest',
		label: '< 110',
		min: 0,
		colour: '#2980b9',
		brightColour: '#74b9ff',
		width: 2
	}
]);

/**
 * Voltage floors in band order — the thresholds the layers' `case` expressions
 * test against. Indexed rather than mapped inline so each stays a plain number
 * in the expression, keeping the paint object's tuple inference intact.
 *
 * @type {number[]}
 */
export const BAND_MIN = TRANSMISSION_BANDS.map((band) => band.min);

/**
 * The colour a band paints on the given basemap. Takes the theme rather than a
 * boolean so every surface answers "is this basemap dark?" the same way — the
 * layers and the key used to disagree, leaving the key showing bright swatches
 * for lines the dark map was drawing in the deep tones.
 *
 * @param {TransmissionBand} band
 * @param {'light' | 'dark' | 'satellite'} mapTheme
 * @returns {string}
 */
export function bandColour(band, mapTheme) {
	return mapTheme === 'light' ? band.colour : band.brightColour;
}

/**
 * Every band's colour for the given basemap, in band order — the shape the
 * layers' `case` expressions index into.
 *
 * @param {'light' | 'dark' | 'satellite'} mapTheme
 * @returns {string[]}
 */
export function bandColours(mapTheme) {
	return TRANSMISSION_BANDS.map((band) => bandColour(band, mapTheme));
}

/** Source of the transmission-lines dataset, credited in the map key. */
export const TRANSMISSION_SOURCE_HREF =
	'https://digital.atlas.gov.au/datasets/digitalatlas::electricity-transmission-lines/about';
