/**
 * The generation chart's optional overlays — the URL-owned toggles drawn over
 * the fuel-tech stack from the table's summary rows — and their presentation.
 * One registry so the canvas (bands and lines), the table (swatches) and the
 * URL codec (canonical order) agree on ids, labels and colours.
 */

import { getFuelTechColour } from '$lib/components/charts/colours.js';

/** @typedef {import('./types.js').TrackerOverlay} TrackerOverlay */

/** Every overlay, in the canonical `overlay=` parameter order. */
export const TRACKER_OVERLAYS = /** @type {const} */ ([
	'demand',
	'renewables',
	'curtailment-solar',
	'curtailment-wind'
]);

/** OE red for the operational demand line. */
export const DEMAND_LINE_COLOUR = '#C74523';
export const RENEWABLES_LINE_COLOUR = getFuelTechColour('renewables');

/**
 * @typedef {Object} CurtailmentSeries
 * @property {string} id - Processed series id (`curtailment_solar` / `curtailment_wind`)
 * @property {TrackerOverlay} overlay - URL overlay value that shows the band
 * @property {string} label
 * @property {string} colour - Hatched in the source fuel tech's colour
 */

/**
 * Curtailment bands in fixed stacking order, bottom-up: wind rides directly
 * above the solar area, solar curtailment stacks above wind — regardless of
 * toggle order.
 * @type {CurtailmentSeries[]}
 */
export const CURTAILMENT_SERIES = [
	{
		id: 'curtailment_wind',
		overlay: 'curtailment-wind',
		label: 'Curtailment (Wind)',
		colour: getFuelTechColour('wind')
	},
	{
		id: 'curtailment_solar',
		overlay: 'curtailment-solar',
		label: 'Curtailment (Solar)',
		colour: getFuelTechColour('solar_utility')
	}
];

/** @type {Record<string, string>} */
export const CURTAILMENT_COLOURS = Object.fromEntries(
	CURTAILMENT_SERIES.map((series) => [series.id, series.colour])
);

/**
 * The overlay value that toggles a curtailment series, or null for an
 * unknown id.
 * @param {string} seriesId
 * @returns {TrackerOverlay | null}
 */
export function curtailmentOverlayFor(seriesId) {
	return CURTAILMENT_SERIES.find((series) => series.id === seriesId)?.overlay ?? null;
}
