import { describe, it, expect } from 'vitest';
import { computeStepBand, stepBandCentre } from './step-band.js';

describe('computeStepBand', () => {
	it('returns [T_i, T_{i+1}) for an interior point', () => {
		const dataset = [{ time: 0 }, { time: 10 }, { time: 20 }];
		expect(computeStepBand(1, dataset)).toEqual({ startMs: 10, endMs: 20 });
	});

	it('returns [T_0, T_1) for the first point', () => {
		const dataset = [{ time: 0 }, { time: 10 }];
		expect(computeStepBand(0, dataset)).toEqual({ startMs: 0, endMs: 10 });
	});

	it('extrapolates the last point by the previous interval', () => {
		const dataset = [{ time: 0 }, { time: 10 }, { time: 20 }];
		// prev interval = 10, so band = [20, 30]
		expect(computeStepBand(2, dataset)).toEqual({ startMs: 20, endMs: 30 });
	});

	it('handles uneven spacing by using the actual next-neighbour time', () => {
		const dataset = [{ time: 0 }, { time: 100 }, { time: 110 }];
		// Middle point's band = [T_1, T_2] = [100, 110]
		expect(computeStepBand(1, dataset)).toEqual({ startMs: 100, endMs: 110 });
	});

	it('uses the previous interval for the last point with uneven spacing', () => {
		const dataset = [{ time: 0 }, { time: 100 }, { time: 110 }];
		// prev interval = 110 - 100 = 10, so band = [110, 120]
		expect(computeStepBand(2, dataset)).toEqual({ startMs: 110, endMs: 120 });
	});

	it('returns null for a single-point dataset', () => {
		expect(computeStepBand(0, [{ time: 0 }])).toBeNull();
	});

	it('returns null for an empty dataset', () => {
		expect(computeStepBand(0, [])).toBeNull();
	});

	it('returns null for an out-of-range index', () => {
		const dataset = [{ time: 0 }, { time: 10 }];
		expect(computeStepBand(-1, dataset)).toBeNull();
		expect(computeStepBand(5, dataset)).toBeNull();
	});
});

describe('stepBandCentre', () => {
	const rows = [{ time: 0 }, { time: 100 }, { time: 300 }];
	it('puts a bucket in the middle of its step', () => {
		expect(stepBandCentre(0, rows)).toBe(50);
		expect(stepBandCentre(100, rows)).toBe(200);
		// The last step is as wide as the one before it.
		expect(stepBandCentre(300, rows)).toBe(400);
	});
	it('leaves a time that is not a row where it is', () => {
		expect(stepBandCentre(150, rows)).toBe(150);
		expect(stepBandCentre(5, [{ time: 5 }])).toBe(5);
	});
});
