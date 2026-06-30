import { describe, it, expect } from 'vitest';
import {
	createPriceYScale,
	formatPriceTick,
	PRICE_Y_DOMAIN,
	PRICE_Y_TICKS
} from './price-y-scale.js';

describe('price-y-scale', () => {
	it('exposes the fixed domain and always-on gridlines including 0', () => {
		expect(PRICE_Y_DOMAIN).toEqual([-1000, 23200]);
		expect(PRICE_Y_TICKS).toContain(0);
		expect(PRICE_Y_TICKS).toContain(300);
		// Sorted ascending, spanning the domain.
		expect([...PRICE_Y_TICKS].sort((a, b) => a - b)).toEqual(PRICE_Y_TICKS);
		expect(PRICE_Y_TICKS.every((t) => t >= -1000 && t <= 23200)).toBe(true);
	});

	it('places the region breakpoints at the configured height fractions', () => {
		// Default range [0,1] makes scale(v) === the value→fraction transform.
		const scale = createPriceYScale();
		expect(scale(-1000)).toBeCloseTo(0, 10); // bottom
		expect(scale(0)).toBeCloseTo(0.16, 10); // top of the negative-log band
		expect(scale(300)).toBeCloseTo(0.7, 10); // top of the linear band (0.16 + 0.54)
		expect(scale(23200)).toBeCloseTo(1, 10); // top
	});

	it('is strictly monotonic increasing across the whole domain', () => {
		const scale = createPriceYScale();
		const samples = [
			-1000, -500, -100, -10, -1, 0, 1, 50, 150, 299, 300, 301, 900, 1000, 5000, 23200
		];
		for (let i = 1; i < samples.length; i++) {
			expect(scale(samples[i])).toBeGreaterThan(scale(samples[i - 1]));
		}
	});

	it('maps a pixel range with LayerCake-style [height, 0] orientation', () => {
		const scale = createPriceYScale();
		scale.range([200, 0]); // height 200, data min at the bottom
		expect(scale(-1000)).toBeCloseTo(200, 6); // bottom pixel
		expect(scale(23200)).toBeCloseTo(0, 6); // top pixel
		expect(scale(0)).toBeCloseTo(200 * (1 - 0.16), 6);
		expect(scale(300)).toBeCloseTo(200 * (1 - 0.7), 6);
	});

	it('round-trips invert(scale(v)) in every segment', () => {
		const scale = createPriceYScale();
		scale.range([200, 0]);
		for (const v of [-1000, -100, -1, 0, 100, 200, 300, 1000, 10000, 23200]) {
			expect(scale.invert(scale(v))).toBeCloseTo(v, 4);
		}
	});

	it('clamps values outside the domain to the edges', () => {
		const scale = createPriceYScale();
		expect(scale(50000)).toBeCloseTo(1, 10); // above the cap → top
		expect(scale(-5000)).toBeCloseTo(0, 10); // below the floor → bottom
	});

	it('copy() preserves domain and range independently', () => {
		const scale = createPriceYScale();
		scale.range([200, 0]);
		const copy = scale.copy();
		expect(copy(300)).toBeCloseTo(scale(300), 10);
		copy.range([400, 0]);
		// Mutating the copy must not affect the original.
		expect(scale(300)).toBeCloseTo(200 * (1 - 0.7), 6);
	});

	it('labels only the linear $0–$300 band; log lines render without a label', () => {
		expect(formatPriceTick(0)).toBe('$0');
		expect(formatPriceTick(100)).toBe('$100');
		expect(formatPriceTick(200)).toBe('$200');
		expect(formatPriceTick(300)).toBe('$300');
		// Log tails — gridline only, no label.
		expect(formatPriceTick(1000)).toBe('');
		expect(formatPriceTick(3000)).toBe('');
		expect(formatPriceTick(10000)).toBe('');
		expect(formatPriceTick(-100)).toBe('');
		expect(formatPriceTick(-1000)).toBe('');
	});
});
