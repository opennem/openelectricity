import chroma from 'chroma-js';
import { spectrum } from '$lib/colours.js';
import { fuelTechColourMap } from '$lib/theme/openelectricity.js';
import { comparisonMetric, comparisonUnit, formatComparisonValue } from './comparison-metrics.js';
import { nextPeriodStart } from './region-comparison.js';

/**
 * Colour scales and cell geometry for the Compare regions stripes display.
 *
 * Scales are fixed and absolute so a cell's colour means the same thing in
 * every region and every year; only generation, which has no natural ceiling,
 * scales to the visible maximum. Missing readings are never zero: they take
 * the page's warm grey rather than the bottom of a ramp.
 */

/** Tailwind `warm-grey`: the fill for periods with no reading. */
export const STRIPE_EMPTY_COLOUR = '#F1F0ED';
const NEUTRAL = '#CCCCCC';
const WHITE = '#FFFFFF';
const PRICE_STOPS = [-1000, 0, 50, 100, 300, 1000, 5000, 15000];
const PRICE_LABELS = ['-$1k', '$0', '$50', '$100', '$300', '$1k', '$5k', '$15k'];
const PRICE_COLOURS = [
	'#613C9E',
	'#28609A',
	'#76ACCE',
	'#F0BA9F',
	'#DF8E73',
	'#C5594C',
	'#99292F',
	'#621020'
];
const INTENSITY_STOPS = [0, 100, 300, 550, 1000];
const DIVERGING = ['#2E69A3', WHITE, '#AC3837'];

/** @typedef {{kind: 'ramp' | 'swatch' | 'diverging', domain: number[], colours: string[], labels: string[]}} StripeRamp */
/** @typedef {StripeRamp & {colour: (value: number | null | undefined) => string, unit: string}} StripeScale */

/** @param {string | undefined} fuel */
function fuelColour(fuel) {
	return (fuel && fuelTechColourMap[fuel]) || fuelTechColourMap.renewables;
}

/** @param {number} value @param {string} id */
const label = (value, id) => formatComparisonValue(value, id);

/**
 * @param {string} id @param {'demand' | 'generation'} basis
 * @param {number} max - Visible maximum, for the data-driven generation domain
 * @returns {StripeRamp}
 */
function stripeRamp(id, basis, max) {
	const metric = comparisonMetric(id);
	if (id === 'intensity')
		return {
			kind: 'ramp',
			domain: INTENSITY_STOPS,
			colours: spectrum.intensity,
			labels: [label(0, id), label(1000, id)]
		};
	if (id === 'net_imports_share')
		return {
			kind: 'diverging',
			domain: [-25, 0, 25],
			colours: DIVERGING,
			labels: ['Export', 'Import']
		};
	if (metric.kind === 'price')
		return { kind: 'swatch', domain: PRICE_STOPS, colours: PRICE_COLOURS, labels: PRICE_LABELS };
	if (metric.kind === 'energy') {
		return {
			kind: 'ramp',
			domain: [0, max || 1],
			colours: [WHITE, fuelColour(metric.fuel)],
			labels: [label(0, id), label(max, id)]
		};
	}
	// Proportions. Fossil shares read as renewables green at zero, so a
	// fossil-free period is unmistakable, then climb to the fuel colour.
	if (metric.fuel === 'gas' || metric.fuel === 'coal') {
		const top = metric.fuel === 'gas' ? 50 : 90;
		return {
			kind: 'ramp',
			domain: [0, 0.1, top],
			colours: [fuelTechColourMap.renewables, NEUTRAL, fuelColour(metric.fuel)],
			labels: [label(0, id), label(top, id)]
		};
	}
	const colour = fuelColour(metric.fuel);
	return {
		kind: 'ramp',
		domain: [0, 50, 100],
		colours: [WHITE, colour, chroma(colour).darken(1.5).hex()],
		labels: [label(0, id), label(100, id)]
	};
}

/** The largest finite value, or zero. @param {Array<number | null | undefined>} values */
export function stripeMax(values) {
	let max = 0;
	for (const value of values)
		if (Number.isFinite(value) && Number(value) > max) max = Number(value);
	return max;
}

/** @type {Map<string, StripeScale>} */
const scales = new Map();
const SCALE_CACHE_LIMIT = 64;

/**
 * The stripes colour scale for a metric. Values beyond the domain clamp to
 * its ends (so negative shares floor at zero) and missing readings are grey.
 * Memoised on its inputs so a pan frame that changes nothing hands the
 * renderer the same object, and no cell recolours; colours are memoised too,
 * since chroma is slow enough per call to matter across thousands of cells.
 * @param {string} id @param {'demand' | 'generation'} basis
 * @param {number} [max] - Visible maximum (generation only)
 * @returns {StripeScale}
 */
export function stripeScale(id, basis, max = 0) {
	const key = `${id}|${basis}|${max}`;
	const cached = scales.get(key);
	if (cached) return cached;
	const ramp = stripeRamp(id, basis, max);
	const scale = chroma.scale(ramp.colours).domain(ramp.domain);
	/** @type {Map<number, string>} */
	const colours = new Map();
	const result = {
		...ramp,
		unit: comparisonUnit(id, basis),
		colour: (/** @type {number | null | undefined} */ value) => {
			if (!Number.isFinite(value)) return STRIPE_EMPTY_COLOUR;
			const rounded = Math.round(Number(value) * 10) / 10;
			let colour = colours.get(rounded);
			if (!colour) {
				colour = scale(rounded).hex();
				colours.set(rounded, colour);
			}
			return colour;
		}
	};
	if (scales.size >= SCALE_CACHE_LIMIT)
		scales.delete(/** @type {string} */ (scales.keys().next().value));
	scales.set(key, result);
	return result;
}

/** A CSS gradient reproducing the ramp between its first and last stop.
 * @param {StripeRamp} ramp */
export function stripeGradient(ramp) {
	const min = ramp.domain[0];
	const span = ramp.domain[ramp.domain.length - 1] - min || 1;
	const stops = ramp.colours.map(
		(colour, index) => `${colour} ${((ramp.domain[index] - min) / span) * 100}%`
	);
	return `linear-gradient(to right, ${stops.join(', ')})`;
}

/** Legend entries for exports: every price stop, or a ramp's two ends, plus
 * the no-data grey.
 * @param {StripeScale} scale @returns {{label: string, colour: string}[]} */
export function stripeLegendItems(scale) {
	const items =
		scale.kind === 'swatch'
			? scale.colours.map((colour, index) => ({ colour, label: scale.labels[index] }))
			: [
					{ colour: scale.colours[0], label: scale.labels[0] },
					{ colour: scale.colours[scale.colours.length - 1], label: scale.labels[1] }
				];
	return [
		...items.map((item) => ({ ...item, label: `${item.label} ${scale.unit}`.trim() })),
		{ colour: STRIPE_EMPTY_COLOUR, label: 'No data' }
	];
}

/** @typedef {{time: number, x: number, width: number}} StripeCell */
/**
 * Cell geometry at absolute time positions: x is measured from `origin` so a
 * sliding viewport translates the drawn cells rather than re-laying them out.
 * @param {Array<{time: number}>} rows @param {string} interval
 * @param {number} origin @param {number} pxPerMs
 * @returns {StripeCell[]}
 */
export function stripeCells(rows, interval, origin, pxPerMs) {
	return rows.map((row) => ({
		time: row.time,
		x: (row.time - origin) * pxPerMs,
		width: (nextPeriodStart(row.time, interval) - row.time) * pxPerMs
	}));
}

/** The period containing an instant, or null between or beyond periods.
 * @param {Array<{time: number}>} rows - In time order @param {string} interval @param {number} time */
export function stripePeriodAt(rows, interval, time) {
	let low = 0,
		high = rows.length - 1,
		found = -1;
	while (low <= high) {
		const mid = (low + high) >> 1;
		if (rows[mid].time <= time) {
			found = mid;
			low = mid + 1;
		} else high = mid - 1;
	}
	if (found < 0) return null;
	const row = rows[found];
	return time < nextPeriodStart(row.time, interval) ? row.time : null;
}
