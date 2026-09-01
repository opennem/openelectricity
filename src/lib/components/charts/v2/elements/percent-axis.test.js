import { describe, expect, it } from 'vitest';
import { percentAxisTicks } from './percent-axis.js';

describe('percentAxisTicks', () => {
	it('keeps 20% ticks for ordinary percentage ranges', () => {
		expect(percentAxisTicks(100)).toEqual([0, 20, 40, 60, 80]);
		expect(percentAxisTicks(120)).toEqual([0, 20, 40, 60, 80, 100]);
	});

	it('bounds label density for an extreme percentage domain', () => {
		const ticks = percentAxisTicks(2960);
		expect(ticks).toEqual([0, 500, 1000, 1500, 2000, 2500]);
		expect(ticks.length).toBeLessThanOrEqual(6);
		expect(percentAxisTicks(180).length).toBeLessThanOrEqual(6);
	});

	it('returns a stable origin for invalid domains', () => {
		expect(percentAxisTicks(NaN)).toEqual([0]);
		expect(percentAxisTicks(0)).toEqual([0]);
	});
});
