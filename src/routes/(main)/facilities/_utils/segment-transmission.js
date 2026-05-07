/**
 * Convert a transmission-line GeoJSON FeatureCollection into the per-segment
 * shape deck.gl's `LineLayer` consumes — `{ from: [lng, lat], to: [lng, lat],
 * color, width, ... }`. Voltage tier drives alpha + width; facility
 * proximity drives the hue (blue → red).
 *
 * A LineString feature with N coordinates yields N-1 segment entries.
 */

import { mixRgb } from '$lib/utils/colour-darken.js';

/**
 * @typedef {{ high: boolean, medium: boolean, low: boolean, lowest: boolean }} VoltageVisibility
 *
 * @typedef {{
 *   from: [number, number],
 *   to: [number, number],
 *   color: [number, number, number, number],
 *   width: number,
 *   capacitykv: number,
 *   name?: string
 * }} LineSegment
 */

/**
 * Return the voltage tier band a `capacitykv` value falls into — matches the
 * `transmissionLineVisibility` keys.
 *
 * @param {number} kv
 * @returns {'high' | 'medium' | 'low' | 'lowest'}
 */
export function voltageBand(kv) {
	if (kv >= 400) return 'high';
	if (kv >= 220) return 'medium';
	if (kv >= 110) return 'low';
	return 'lowest';
}

/**
 * Per-band alpha (0-255). Higher voltage = brighter line so the tier reads
 * even though hue is reserved for facility proximity.
 *
 * @param {'high' | 'medium' | 'low' | 'lowest'} band
 */
export function alphaFor(band) {
	if (band === 'high') return 230;
	if (band === 'medium') return 175;
	if (band === 'low') return 125;
	return 80;
}

/** Stand-out base RGB for a segment far from any facility.
 * @type {[number, number, number]} */
export const FAR_RGB = [56, 130, 245]; // azure
/** Hot RGB for a segment passing right next to a facility (or through a
 * cluster). Mixed with `FAR_RGB` based on per-segment proximity.
 * @type {[number, number, number]} */
export const NEAR_RGB = [244, 63, 94]; // rose

// Distance window in degrees lat/lng for the proximity gradient. Below
// `NEAR_DEG` (~5 km), the segment is fully red; above `FAR_DEG` (~55 km),
// fully blue; linear in between. Clusters of facilities create overlapping
// red zones that visually merge into hotter regions.
const NEAR_DEG = 0.05;
const FAR_DEG = 0.5;

/**
 * Compute the proximity score `0..1` for a point against a list of facility
 * positions. `0` = far from any facility, `1` = adjacent to one. Linear
 * inside the `[NEAR_DEG, FAR_DEG]` band.
 *
 * O(N) brute-force scan — fine for one-off lookups + tests. The inner loop
 * of `segmentTransmission` uses the bucketed `proximityScoreFromGrid` for a
 * ~30× speedup at AU scale.
 *
 * @param {[number, number]} point
 * @param {[number, number][] | null | undefined} facilityPoints
 * @returns {number}
 */
export function proximityScore(point, facilityPoints) {
	if (!facilityPoints?.length) return 0;
	let bestSq = Infinity;
	for (let i = 0; i < facilityPoints.length; i++) {
		const fp = facilityPoints[i];
		const dx = point[0] - fp[0];
		const dy = point[1] - fp[1];
		const d = dx * dx + dy * dy;
		if (d < bestSq) bestSq = d;
	}
	return scoreFromDistanceSq(bestSq);
}

/** @typedef {Map<string, [number, number][]>} FacilityGrid */

/**
 * Bucket facility positions into a uniform grid keyed by `floor(coord /
 * FAR_DEG)`. The grid lookup only inspects the cell + its 8 neighbours, so
 * any facility within `FAR_DEG` of the query point is guaranteed to be
 * found and anything further can't change the score.
 *
 * @param {[number, number][] | null | undefined} facilityPoints
 * @returns {FacilityGrid | null}
 */
export function buildFacilityGrid(facilityPoints) {
	if (!facilityPoints?.length) return null;
	/** @type {FacilityGrid} */
	const grid = new Map();
	for (const fp of facilityPoints) {
		const key = `${Math.floor(fp[0] / FAR_DEG)},${Math.floor(fp[1] / FAR_DEG)}`;
		const bucket = grid.get(key);
		if (bucket) bucket.push(fp);
		else grid.set(key, [fp]);
	}
	return grid;
}

/**
 * Grid-accelerated equivalent of `proximityScore`. Same return contract.
 *
 * @param {[number, number]} point
 * @param {FacilityGrid | null} grid
 * @returns {number}
 */
export function proximityScoreFromGrid(point, grid) {
	if (!grid) return 0;
	const cx = Math.floor(point[0] / FAR_DEG);
	const cy = Math.floor(point[1] / FAR_DEG);
	let bestSq = Infinity;
	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			const bucket = grid.get(`${cx + dx},${cy + dy}`);
			if (!bucket) continue;
			for (const fp of bucket) {
				const px = point[0] - fp[0];
				const py = point[1] - fp[1];
				const d = px * px + py * py;
				if (d < bestSq) bestSq = d;
			}
		}
	}
	return scoreFromDistanceSq(bestSq);
}

/** @param {number} distSq */
function scoreFromDistanceSq(distSq) {
	if (!Number.isFinite(distSq)) return 0;
	const dist = Math.sqrt(distSq);
	if (dist <= NEAR_DEG) return 1;
	if (dist >= FAR_DEG) return 0;
	return 1 - (dist - NEAR_DEG) / (FAR_DEG - NEAR_DEG);
}

/**
 * Per-segment RGBA in deck.gl's `[r, g, b, a]` shape. Hue is `FAR_RGB →
 * NEAR_RGB` mixed by `proximity`; alpha is `alphaFor(band)`.
 *
 * @param {'high' | 'medium' | 'low' | 'lowest'} band
 * @param {number} proximity
 * @returns {[number, number, number, number]}
 */
export function colourFor(band, proximity) {
	const [r, g, b] = mixRgb(FAR_RGB, NEAR_RGB, proximity);
	return [r, g, b, alphaFor(band)];
}

/**
 * Per-tier line width in pixels. With colour coding reserved for proximity,
 * width carries the voltage signal — keep the spread wide so 500 kV reads
 * as "thicker spine" against the lowest-voltage capillaries.
 *
 * @param {'high' | 'medium' | 'low' | 'lowest'} band
 */
export function widthFor(band) {
	if (band === 'high') return 3.5;
	if (band === 'medium') return 2.5;
	if (band === 'low') return 1.5;
	return 0.8;
}

/**
 * Walk a transmission GeoJSON FeatureCollection and emit one `LineSegment`
 * per consecutive pair of LineString coordinates. Filters out features that:
 *
 *   - aren't `operationalstatus === 'Operational'`
 *   - fall in a voltage band the user has toggled off
 *
 * If `facilityPoints` is supplied, each segment's hue is mixed toward
 * `NEAR_RGB` based on the segment midpoint's distance to the nearest
 * facility — clusters of facilities produce hotter regions of the grid.
 *
 * @param {{ features: any[] } | null | undefined} geojson
 * @param {VoltageVisibility} voltageVisibility
 * @param {[number, number][] | null} [facilityPoints]
 * @returns {LineSegment[]}
 */
export function segmentTransmission(geojson, voltageVisibility, facilityPoints = null) {
	if (!geojson?.features?.length) return [];
	const grid = buildFacilityGrid(facilityPoints);
	/** @type {LineSegment[]} */
	const out = [];
	for (const f of geojson.features) {
		const props = f?.properties ?? {};
		if (props.operationalstatus !== 'Operational') continue;
		const kv = Number(props.capacitykv) || 0;
		const band = voltageBand(kv);
		if (!voltageVisibility[band]) continue;
		const coords = f?.geometry?.coordinates;
		if (!Array.isArray(coords) || coords.length < 2) continue;

		const width = widthFor(band);
		const name = typeof props.name === 'string' ? props.name : undefined;

		for (let i = 0; i < coords.length - 1; i++) {
			const a = coords[i];
			const b = coords[i + 1];
			/** @type {[number, number]} */
			const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
			const proximity = proximityScoreFromGrid(midpoint, grid);
			out.push({
				from: [a[0], a[1]],
				to: [b[0], b[1]],
				color: colourFor(band, proximity),
				width,
				capacitykv: kv,
				name
			});
		}
	}
	return out;
}
