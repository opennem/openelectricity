/**
 * Shared electricity spot-price colour scale — the quantile greys used by the
 * homepage system-snapshot map, its legend, and the tracker's price chips, so
 * every price-tinted surface reads identically.
 */

import { scaleQuantile } from 'd3-scale';

/** Legend swatch positions (fractions of the bar width). */
export const priceColourRanges = [0, 0.0625, 0.0656, 0.0688, 0.0813, 0.125, 0.375, 1];

/** Quantile band colours, lightest (negative prices) to darkest ($15k cap). */
export const priceColours = [
	'#F2F1EE',
	'#D1D0CD',
	'#B0B0AE',
	'#91918F',
	'#737372',
	'#565655',
	'#3B3B3B',
	'#222222'
];

/** Legend labels for the band boundaries. */
export const priceLabels = ['-$1k', '$0', '$50', '$100', '$300', '$1k', '$5k', '$15k'];

/** $/MWh → band colour. */
export const priceColour = scaleQuantile([-1000, 0, 50, 100, 300, 1000, 5000, 15000], priceColours);
