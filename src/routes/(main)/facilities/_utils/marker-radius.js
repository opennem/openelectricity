import { normaliseValue } from './normalise-metric.js';

/**
 * Marker radius scale for the facilities map.
 *
 * Capacity is normalised to 0..1 by `normaliseMetric` (sqrt of the ratio to the
 * largest facility in the set), and the map ramps that linearly from
 * `CIRCLE_MIN` to `CIRCLE_MAX`. The circle paint expression and the size legend
 * both read from here, so the legend's reference circles can't drift away from
 * the markers they describe.
 */

/** Circle radius range (px) — was tunable via the (removed) experiments panel. */
export const CIRCLE_MIN = 4;
export const CIRCLE_MAX = 28;

/**
 * Circle radius stops for MapLibre's `interpolate` expression. Two points define
 * the linear ramp `radiusForCapacity` walks, and MapLibre clamps inputs outside
 * the domain to the endpoints — so intermediate stops would only restate the
 * line they already sit on.
 *
 * @param {number} min
 * @param {number} max
 * @returns {number[]}
 */
export function buildCircleStops(min, max) {
	return [0, min, 1, max];
}

/**
 * Radius (px) the map paints for a raw capacity — `normaliseMetric`'s sqrt
 * normalisation composed with the linear radius ramp.
 *
 * @param {number} value - Raw capacity (MW)
 * @param {number} max - Largest capacity in the set (the normalisation denominator)
 * @returns {number}
 */
export function radiusForCapacity(value, max) {
	if (!(value > 0) || !(max > 0)) return CIRCLE_MIN;
	return CIRCLE_MIN + (CIRCLE_MAX - CIRCLE_MIN) * Math.min(1, normaliseValue(value, max));
}

/**
 * Round down to the nearest 1, 2 or 5 × a power of ten, so legend labels land on
 * values a reader recognises (2,000 MW rather than 2,953 MW).
 *
 * @param {number} value
 * @returns {number}
 */
function niceFloor(value) {
	if (!(value > 0)) return 0;
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const lead = value / magnitude;
	return (lead >= 5 ? 5 : lead >= 2 ? 2 : 1) * magnitude;
}

/**
 * Reference stops for the map's size legend: round capacities at roughly a
 * sixteenth and a quarter of the largest facility, plus the largest itself.
 * Radius being linear in the square root of the ratio, those quarters space the
 * circles evenly. Radii are computed against the true `max` (not the rounded
 * stop values), so each circle is exactly the size the map would paint.
 *
 * @param {number} max - Largest capacity in the set (MW)
 * @returns {{ value: number, radius: number }[]} Ascending by value
 */
export function capacityLegendStops(max) {
	const top = niceFloor(max);
	if (!top) return [];

	// A 4× gap always clears a step on the 1/2/5 ladder, so the three stops are
	// distinct for any positive max — no dedup needed.
	return [top / 16, top / 4, top].map((raw) => {
		const value = niceFloor(raw);
		return { value, radius: radiusForCapacity(value, max) };
	});
}
