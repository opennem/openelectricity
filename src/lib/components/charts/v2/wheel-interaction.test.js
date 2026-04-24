import { describe, it, expect } from 'vitest';
import {
	classifyWheelIntent,
	wheelPanDeltaMs,
	wheelZoomFactor
} from './wheel-interaction.js';

describe('classifyWheelIntent', () => {
	it('returns "pan" when horizontal delta dominates', () => {
		expect(classifyWheelIntent(10, 2)).toBe('pan');
	});

	it('uses absolute magnitudes (negative horizontal still pans)', () => {
		expect(classifyWheelIntent(-12, 5)).toBe('pan');
	});

	it('returns "zoom" when vertical delta dominates', () => {
		expect(classifyWheelIntent(1, 20)).toBe('zoom');
	});

	it('returns "zoom" when deltas are equal (ties favour vertical)', () => {
		expect(classifyWheelIntent(5, 5)).toBe('zoom');
	});

	it('returns "zoom" when both are zero', () => {
		expect(classifyWheelIntent(0, 0)).toBe('zoom');
	});
});

describe('wheelPanDeltaMs', () => {
	it('converts horizontal delta to ms using msPerPixel', () => {
		// 1 px = 100 ms → scrolling right 5 px = -500 ms (negated so right = forward)
		expect(wheelPanDeltaMs(5, 1000, 100_000)).toBe(-500);
	});

	it('scrolling left (negative deltaX) returns a positive ms delta', () => {
		expect(wheelPanDeltaMs(-5, 1000, 100_000)).toBe(500);
	});

	it('zero delta returns zero', () => {
		// `0 * anything` may yield -0; assert magnitude to ignore the sign bit.
		expect(Math.abs(wheelPanDeltaMs(0, 1000, 100_000))).toBe(0);
	});

	it('guards against zero or negative width', () => {
		expect(wheelPanDeltaMs(10, 0, 100_000)).toBe(0);
		expect(wheelPanDeltaMs(10, -5, 100_000)).toBe(0);
	});

	it('guards against non-finite or non-positive domain', () => {
		expect(wheelPanDeltaMs(10, 1000, 0)).toBe(0);
		expect(wheelPanDeltaMs(10, 1000, -100)).toBe(0);
		expect(wheelPanDeltaMs(10, 1000, NaN)).toBe(0);
	});

	it('scales linearly with deltaX', () => {
		const a = wheelPanDeltaMs(10, 1000, 86_400_000);
		const b = wheelPanDeltaMs(20, 1000, 86_400_000);
		expect(b).toBe(2 * a);
	});
});

describe('wheelZoomFactor', () => {
	it('returns 1 for zero delta', () => {
		expect(wheelZoomFactor(0)).toBe(1);
	});

	it('returns factor > 1 for negative deltaY (scroll up → zoom in)', () => {
		expect(wheelZoomFactor(-50)).toBeGreaterThan(1);
	});

	it('returns factor < 1 for positive deltaY (scroll down → zoom out)', () => {
		expect(wheelZoomFactor(50)).toBeLessThan(1);
	});

	it('is symmetric: scrolling up and down by equal amounts gives reciprocal factors', () => {
		const zoomIn = wheelZoomFactor(-30);
		const zoomOut = wheelZoomFactor(30);
		expect(zoomIn * zoomOut).toBeCloseTo(1, 10);
	});

	it('a single "tick" stays near 1 (not jumpy)', () => {
		const one = wheelZoomFactor(1);
		expect(one).toBeGreaterThan(0.99);
		expect(one).toBeLessThan(1);
	});
});
