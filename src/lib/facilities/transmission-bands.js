/**
 * Voltage bands for the transmission-lines layers — the single definition every
 * surface that draws or explains them reads from, so a colour can't be changed
 * in one and forgotten in another. Consumers: the /facilities map, the
 * /facility/[code] detail map, the /tracker map and the shared map key.
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

/**
 * Which bands a map is drawing, keyed by band. The map key's swatches toggle
 * these; the maps feed them to `transmissionBandFilter`.
 *
 * @typedef {{ high: boolean, medium: boolean, low: boolean, lowest: boolean }} BandVisibility
 */

/**
 * Every band on — the default visibility, and the state the legend-hide
 * policy restores. A factory (fresh object per call) so two owners can't end
 * up aliasing one shared object; derived from TRANSMISSION_BANDS, so a new
 * band is visible-by-default automatically.
 * @returns {BandVisibility}
 */
export function allBandsVisible() {
	return /** @type {BandVisibility} */ (
		Object.fromEntries(TRANSMISSION_BANDS.map((band) => [band.key, true]))
	);
}

/**
 * MapLibre filter expression for a transmission layer given per-band
 * visibility — one condition per visible band, walked off TRANSMISSION_BANDS.
 * Each band runs from its own floor up to the previous band's; writing that by
 * hand meant stating every threshold twice, so a boundary could be moved on
 * one side of a pair and not the other. Operational lines only — the dataset's
 * proposed/decommissioned features are noise on every surface.
 *
 * @param {BandVisibility} visibility
 * @returns {any}
 */
export function transmissionBandFilter(visibility) {
	/** @type {any[]} */
	const voltageConditions = [];

	TRANSMISSION_BANDS.forEach((band, i) => {
		if (!visibility[band.key]) return;
		/** @type {any[]} */
		const clauses = [];
		// The top band has no ceiling and the bottom band no floor; the rest are
		// bounded both ways by their own min and the band above's.
		if (band.min > 0) clauses.push(['>=', ['get', 'capacitykv'], band.min]);
		if (i > 0) clauses.push(['<', ['get', 'capacitykv'], TRANSMISSION_BANDS[i - 1].min]);
		voltageConditions.push(clauses.length === 1 ? clauses[0] : ['all', ...clauses]);
	});

	// Never match any features
	if (voltageConditions.length === 0) {
		return ['==', ['get', 'operationalstatus'], '__never_match__'];
	}

	return ['all', ['==', ['get', 'operationalstatus'], 'Operational'], ['any', ...voltageConditions]];
}

/** Source of the transmission-lines dataset, credited in the map key. */
export const TRANSMISSION_SOURCE_HREF =
	'https://digital.atlas.gov.au/datasets/digitalatlas::electricity-transmission-lines/about';
