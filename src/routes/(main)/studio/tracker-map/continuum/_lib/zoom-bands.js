/**
 * Zoom-band model for the Continuum prototype.
 *
 * The camera IS the mode switch: zoom level alone decides whether the map
 * reads as the national grid (flow arcs + region badges), a hybrid hand-off,
 * or facilities — there is no explicit mode UI. Bands carry directional
 * hysteresis (the conceptual precedent is `getHysteresisTarget` in
 * `$lib/utils/metric-interval.js`): crossing a boundary only flips the band
 * after overshooting by `BAND_HYSTERESIS` in the direction of travel, so
 * small pans near a threshold can't thrash the dock.
 *
 * Layer opacities are continuous ramps over the hybrid window — derived from
 * zoom every frame, never stepped — so the grid→facilities hand-off reads as
 * one cross-fade rather than a mode flip.
 */

import { REGION_ANCHORS, REGION_BOUNDS } from '../../_shared/region-geo.js';

/** @typedef {'national' | 'hybrid' | 'facilities'} ZoomBand */

/** Zoom at which the hybrid band begins (below this the map is national). */
export const HYBRID_MIN_ZOOM = 5.2;
/** Zoom at which the facilities band begins. */
export const FACILITIES_MIN_ZOOM = 6.5;
/** Overshoot past a boundary (in the direction of travel) required to flip. */
export const BAND_HYSTERESIS = 0.15;

/** Facility dots stay faintly visible even in the national band. */
const FACILITIES_MIN_OPACITY = 0.15;

/** Below this latitude the camera is over Bass Strait / Tasmania. */
const TAS_LATITUDE_CUTOFF = -40.5;

const BANDS = ['national', 'hybrid', 'facilities'];

/**
 * Memoryless zoom → band mapping (no hysteresis). Used to seed the band and
 * as the fallback when `nextBand` receives an unknown current band.
 * @param {number} zoom
 * @returns {ZoomBand}
 */
export function bandForZoom(zoom) {
	if (zoom < HYBRID_MIN_ZOOM) return 'national';
	if (zoom < FACILITIES_MIN_ZOOM) return 'hybrid';
	return 'facilities';
}

/**
 * One hysteresis step from `current` at `zoom` — returns the adjacent band
 * when the zoom has overshot the shared boundary, else `current`.
 * @param {ZoomBand} current
 * @param {number} zoom
 * @returns {ZoomBand}
 */
function stepBand(current, zoom) {
	if (current === 'national') {
		if (zoom >= HYBRID_MIN_ZOOM + BAND_HYSTERESIS) return 'hybrid';
	} else if (current === 'hybrid') {
		if (zoom >= FACILITIES_MIN_ZOOM + BAND_HYSTERESIS) return 'facilities';
		if (zoom <= HYBRID_MIN_ZOOM - BAND_HYSTERESIS) return 'national';
	} else if (zoom <= FACILITIES_MIN_ZOOM - BAND_HYSTERESIS) {
		return 'hybrid';
	}
	return current;
}

/**
 * Resolve the band for `zoom` given the current band, with directional
 * hysteresis. Walks `stepBand` to convergence so a single large jump (a
 * double-click zoom, a `flyTo`) can cross both boundaries in one call —
 * each step moves monotonically toward the band containing `zoom`, so the
 * walk terminates.
 *
 * Examples at the national↔hybrid boundary (5.2 ± 0.15): national flips to
 * hybrid at ≥5.35 going in; hybrid flips back to national at ≤5.05 going out.
 *
 * @param {ZoomBand | string | null | undefined} currentBand
 * @param {number} zoom
 * @returns {ZoomBand}
 */
export function nextBand(currentBand, zoom) {
	if (!BANDS.includes(/** @type {string} */ (currentBand))) return bandForZoom(zoom);
	let band = /** @type {ZoomBand} */ (currentBand);
	let next;
	while ((next = stepBand(band, zoom)) !== band) band = next;
	return band;
}

/**
 * 0..1 ramp across the hybrid window (0 at ≤HYBRID_MIN_ZOOM, 1 at
 * ≥FACILITIES_MIN_ZOOM, linear in between) — the master interpolant for the
 * layer cross-fade.
 * @param {number} zoom
 * @returns {number}
 */
export function bandProgress(zoom) {
	const t = (zoom - HYBRID_MIN_ZOOM) / (FACILITIES_MIN_ZOOM - HYBRID_MIN_ZOOM);
	return Math.min(1, Math.max(0, t));
}

/**
 * Opacity for the grid layers (flow arcs + region badges): fully present in
 * the national band, gone by the facilities band.
 * @param {number} zoom
 * @returns {number}
 */
export function gridOpacity(zoom) {
	return 1 - bandProgress(zoom);
}

/**
 * Opacity for the facilities layer: a faint 0.15 presence in the national
 * band (the facilities are always *there* — zooming reveals them), ramping to
 * full by the facilities band.
 * @param {number} zoom
 * @returns {number}
 */
export function facilitiesOpacity(zoom) {
	return FACILITIES_MIN_OPACITY + (1 - FACILITIES_MIN_OPACITY) * bandProgress(zoom);
}

/**
 * The region the camera is "over": nearest `REGION_ANCHORS` entry by
 * equirectangular (great-circle-ish) distance, with two corrections:
 *
 * - TAS1 is short-circuited for any centre south of Bass Strait — the VIC
 *   anchor would otherwise win over northern Tasmania.
 * - Candidates are first narrowed to regions whose `REGION_BOUNDS` contain
 *   the centre (falling back to all regions when none do). The anchors are
 *   badge positions, not centroids — SA1's sits mid-state, so pure
 *   nearest-anchor hands Adelaide to VIC1. Containment keeps a camera over a
 *   state inside that state; the anchor distance only breaks overlap ties.
 *
 * @param {[number, number]} centerLngLat - Map centre as [lng, lat]
 * @returns {string} Region code (e.g. 'NSW1')
 */
export function dominantRegion([lng, lat]) {
	if (lat < TAS_LATITUDE_CUTOFF) return 'TAS1';

	const codes = Object.keys(REGION_ANCHORS);
	const containing = codes.filter((code) => {
		const bounds = REGION_BOUNDS[code];
		if (!bounds) return false;
		const [[west, south], [east, north]] = bounds;
		return lng >= west && lng <= east && lat >= south && lat <= north;
	});
	const candidates = containing.length > 0 ? containing : codes;

	let best = candidates[0];
	let bestDistSq = Infinity;
	for (const code of candidates) {
		const [anchorLng, anchorLat] = REGION_ANCHORS[code];
		// Equirectangular approximation: scale the longitude delta by the
		// cosine of the mean latitude so east–west distances aren't inflated.
		const meanLatRad = (((lat + anchorLat) / 2) * Math.PI) / 180;
		const dx = (lng - anchorLng) * Math.cos(meanLatRad);
		const dy = lat - anchorLat;
		const distSq = dx * dx + dy * dy;
		if (distSq < bestDistSq) {
			bestDistSq = distSq;
			best = code;
		}
	}
	return best;
}
