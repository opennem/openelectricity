import { describe, it, expect } from 'vitest';
import {
	solarPosition,
	subsolarPoint,
	twilightPolygon,
	MERCATOR_LAT_LIMIT
} from './solar-terminator.js';

/**
 * Ray-cast containment, accounting for unwrapped longitudes.
 * @param {GeoJSON.Position[]} ring
 * @param {number} lng
 * @param {number} lat
 * @returns {boolean}
 */
function contains(ring, lng, lat) {
	return [lng - 360, lng, lng + 360].some((x) => {
		let inside = false;
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const [xi, yi] = ring[i];
			const [xj, yj] = ring[j];
			if (yi > lat !== yj > lat && x < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
				inside = !inside;
			}
		}
		return inside;
	});
}

/** @param {GeoJSON.Feature<GeoJSON.Polygon>} feature */
function ringOf(feature) {
	return feature.geometry.coordinates[0];
}

describe('solarPosition', () => {
	it('has northern declination near the June solstice', () => {
		const { delta } = solarPosition(new Date('2026-06-21T12:00:00Z'));
		expect(delta).toBeGreaterThan(23);
		expect(delta).toBeLessThan(23.7);
	});

	it('has southern declination near the December solstice', () => {
		const { delta } = solarPosition(new Date('2026-12-21T12:00:00Z'));
		expect(delta).toBeLessThan(-23);
		expect(delta).toBeGreaterThan(-23.7);
	});

	it('has near-zero declination at the March equinox', () => {
		const { delta } = solarPosition(new Date('2026-03-20T14:46:00Z'));
		expect(Math.abs(delta)).toBeLessThan(0.5);
	});
});

describe('subsolarPoint', () => {
	it('sits near the Greenwich meridian at noon UTC', () => {
		const { lng } = subsolarPoint(new Date('2026-06-21T12:00:00Z'));
		expect(Math.abs(lng)).toBeLessThan(4);
	});
});

describe('twilightPolygon', () => {
	it('produces a closed ring with finite, mercator-clamped latitudes', () => {
		for (const altitude of [0, -6, -12, -18]) {
			const ring = ringOf(twilightPolygon(new Date('2026-03-20T14:46:00Z'), altitude));
			expect(ring[0]).toEqual(ring[ring.length - 1]);
			for (const [lng, lat] of ring) {
				expect(Number.isFinite(lng)).toBe(true);
				expect(Number.isFinite(lat)).toBe(true);
				expect(Math.abs(lat)).toBeLessThanOrEqual(MERCATOR_LAT_LIMIT);
			}
		}
	});

	it('puts the south polar region in darkness at the June solstice', () => {
		const ring = ringOf(twilightPolygon(new Date('2026-06-21T12:00:00Z')));
		expect(contains(ring, 0, -80)).toBe(true);
		expect(contains(ring, 0, 80)).toBe(false);
	});

	it('puts the north polar region in darkness at the December solstice', () => {
		const ring = ringOf(twilightPolygon(new Date('2026-12-21T12:00:00Z')));
		expect(contains(ring, 0, 80)).toBe(true);
		expect(contains(ring, 0, -80)).toBe(false);
	});

	it('shades the hemisphere opposite the sun', () => {
		// At noon UTC, the antimeridian is night and Greenwich is day.
		const ring = ringOf(twilightPolygon(new Date('2026-06-21T12:00:00Z')));
		expect(contains(ring, 179, 0)).toBe(true);
		expect(contains(ring, -179, 0)).toBe(true);
		expect(contains(ring, 0, 0)).toBe(false);
	});

	it('shades eastern Australia after sunset while the west is still in daylight', () => {
		// 18:00 AEST in Sydney and 16:00 AWST in Perth.
		const ring = ringOf(twilightPolygon(new Date('2026-08-27T08:00:00Z')));
		expect(contains(ring, 151, -33.9)).toBe(true); // Sydney
		expect(contains(ring, 115.9, -32)).toBe(false); // Perth
	});

	it('leaves both poles in twilight at the equinox for the astronomical band', () => {
		const date = new Date('2026-03-20T14:46:00Z');
		const ring = ringOf(twilightPolygon(date, -18));
		expect(contains(ring, 0, 84)).toBe(false);
		expect(contains(ring, 0, -84)).toBe(false);
		const sun = subsolarPoint(date);
		expect(contains(ring, sun.lng + 180, -sun.lat)).toBe(true);
	});

	it('nests each twilight band inside the shallower one', () => {
		const date = new Date('2026-06-21T12:00:00Z');
		const sun = subsolarPoint(date);
		const bands = [0, -6, -12, -18].map((a) => ringOf(twilightPolygon(date, a)));
		for (const ring of bands) {
			expect(contains(ring, sun.lng + 180, -sun.lat)).toBe(true);
			expect(contains(ring, sun.lng, sun.lat)).toBe(false);
		}
		// Just past the terminator is night, but not astronomical night.
		expect(contains(bands[0], sun.lng + 91, -sun.lat)).toBe(true);
		expect(contains(bands[3], sun.lng + 91, -sun.lat)).toBe(false);
	});
});
