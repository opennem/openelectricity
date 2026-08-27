/**
 * Solar twilight polygons from low-precision Astronomical Almanac formulas.
 * Each boundary is a spherical cap centred on the antisolar point.
 */

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** Mercator latitude limit — MapLibre clips geometry beyond this. */
export const MERCATOR_LAT_LIMIT = 85.05;

/**
 * Days since the J2000.0 epoch (2000-01-01T12:00Z), fractional.
 * @param {Date} date
 * @returns {number}
 */
function daysSinceJ2000(date) {
	return date.getTime() / 86400000 - 10957.5;
}

/**
 * Greenwich mean sidereal time, in degrees [0, 360).
 * @param {number} n days since J2000.0
 * @returns {number}
 */
function gmst(n) {
	return (((280.46061837 + 360.98564736629 * n) % 360) + 360) % 360;
}

/**
 * Wrap a longitude into [-180, 180).
 * @param {number} lng
 * @returns {number}
 */
function wrapLng(lng) {
	return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/**
 * The sun's equatorial position for a moment in time.
 * @param {Date} date
 * @returns {{ alpha: number, delta: number }} right ascension and declination, degrees
 */
export function solarPosition(date) {
	const n = daysSinceJ2000(date);
	// Ecliptic longitude from mean longitude + equation-of-centre terms.
	const L = (280.46 + 0.9856474 * n) % 360;
	const g = ((357.528 + 0.9856003 * n) % 360) * D2R;
	const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R;
	const epsilon = (23.4393 - 0.0000004 * n) * D2R;

	const alpha = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda)) * R2D;
	const delta = Math.asin(Math.sin(epsilon) * Math.sin(lambda)) * R2D;
	return { alpha, delta };
}

/**
 * The point on earth where the sun is directly overhead.
 * @param {Date} date
 * @returns {{ lat: number, lng: number }} degrees, lng in [-180, 180)
 */
export function subsolarPoint(date) {
	const { alpha, delta } = solarPosition(date);
	return { lat: delta, lng: wrapLng(alpha - gmst(daysSinceJ2000(date))) };
}

/**
 * The region where the sun sits below `altitude` degrees, as a GeoJSON
 * polygon. Altitude 0 is the day/night terminator; -6, -12 and -18 are the
 * civil, nautical and astronomical twilight boundaries.
 *
 * Longitudes remain unwrapped across the antimeridian. Polar caps close
 * along the Mercator latitude limit.
 *
 * @param {Date} [date]
 * @param {number} [altitude] solar altitude in degrees, <= 0
 * @returns {GeoJSON.Feature<GeoJSON.Polygon>}
 */
export function twilightPolygon(date = new Date(), altitude = 0) {
	const sun = subsolarPoint(date);
	const centreLat = -sun.lat * D2R;
	const centreLng = wrapLng(sun.lng + 180);
	const radius = (90 + altitude) * D2R;

	const sinCentre = Math.sin(centreLat);
	const cosCentre = Math.cos(centreLat);
	const sinR = Math.sin(radius);
	const cosR = Math.cos(radius);

	/** @type {[number, number][]} */
	const ring = [];
	let prevLng = centreLng;
	for (let bearing = 0; bearing <= 360; bearing += 1) {
		const t = bearing * D2R;
		const sinLat = sinCentre * cosR + cosCentre * sinR * Math.cos(t);
		const lat = Math.asin(sinLat) * R2D;
		let lng =
			centreLng + Math.atan2(Math.sin(t) * sinR * cosCentre, cosR - sinCentre * sinLat) * R2D;
		lng -= Math.round((lng - prevLng) / 360) * 360;
		prevLng = lng;
		ring.push([lng, Math.max(-MERCATOR_LAT_LIMIT, Math.min(MERCATOR_LAT_LIMIT, lat))]);
	}

	const netWrap = ring[ring.length - 1][0] - ring[0][0];
	if (Math.abs(netWrap) > 180) {
		// Close a polar cap along the matching Mercator edge.
		const poleLat = centreLat < 0 ? -MERCATOR_LAT_LIMIT : MERCATOR_LAT_LIMIT;
		ring.push([ring[ring.length - 1][0], poleLat], [ring[0][0], poleLat], ring[0]);
	} else {
		// Remove floating-point drift from the closing coordinate.
		ring[ring.length - 1] = ring[0];
	}

	return {
		type: 'Feature',
		properties: {},
		geometry: { type: 'Polygon', coordinates: [ring] }
	};
}
