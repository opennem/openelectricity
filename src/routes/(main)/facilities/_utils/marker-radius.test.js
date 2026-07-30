import { describe, it, expect } from 'vitest';
import {
	CIRCLE_MIN,
	CIRCLE_MAX,
	buildCircleStops,
	radiusForCapacity,
	capacityLegendStops
} from './marker-radius.js';

describe('buildCircleStops', () => {
	it('spans min → max across the 0..1 input', () => {
		expect(buildCircleStops(4, 28)).toEqual([0, 4, 1, 28]);
	});
});

describe('radiusForCapacity', () => {
	it('gives the max radius to the largest facility', () => {
		expect(radiusForCapacity(2000, 2000)).toBe(CIRCLE_MAX);
	});

	it('halves the radius span at a quarter of the max (sqrt scale)', () => {
		expect(radiusForCapacity(500, 2000)).toBe(CIRCLE_MIN + (CIRCLE_MAX - CIRCLE_MIN) / 2);
	});

	it('floors at the min radius for missing, zero or negative values', () => {
		expect(radiusForCapacity(0, 2000)).toBe(CIRCLE_MIN);
		expect(radiusForCapacity(-5, 2000)).toBe(CIRCLE_MIN);
		expect(radiusForCapacity(NaN, 2000)).toBe(CIRCLE_MIN);
	});

	it('clamps values above the max rather than overshooting', () => {
		expect(radiusForCapacity(4000, 2000)).toBe(CIRCLE_MAX);
	});

	it('returns the min radius when the set has no positive max', () => {
		expect(radiusForCapacity(100, 0)).toBe(CIRCLE_MIN);
	});
});

describe('capacityLegendStops', () => {
	it('rounds down to 1/2/5 values inside the real range', () => {
		expect(capacityLegendStops(2953).map((s) => s.value)).toEqual([100, 500, 2000]);
		expect(capacityLegendStops(1000).map((s) => s.value)).toEqual([50, 200, 1000]);
	});

	it('sizes each stop against the true max, not the rounded top stop', () => {
		const [, , top] = capacityLegendStops(2953);
		expect(top.radius).toBeLessThan(CIRCLE_MAX);
		expect(top.radius).toBeCloseTo(radiusForCapacity(2000, 2953), 10);
	});

	it('returns ascending radii', () => {
		const radii = capacityLegendStops(2953).map((s) => s.radius);
		expect(radii).toEqual([...radii].sort((a, b) => a - b));
	});

	it('keeps the three stops distinct even for a tiny set', () => {
		expect(capacityLegendStops(3).map((s) => s.value)).toEqual([0.1, 0.5, 2]);
	});

	it('returns nothing when the set has no capacity', () => {
		expect(capacityLegendStops(0)).toEqual([]);
		expect(capacityLegendStops(NaN)).toEqual([]);
	});
});
