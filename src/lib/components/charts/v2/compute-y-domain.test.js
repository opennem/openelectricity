import { describe, it, expect } from 'vitest';
import { computeYDomain } from './compute-y-domain.js';

describe('computeYDomain', () => {
	it('returns [0, 0] for empty data', () => {
		expect(computeYDomain([])).toEqual([0, 0]);
	});

	it('returns [0, 0] for null/undefined data', () => {
		expect(computeYDomain(null)).toEqual([0, 0]);
		expect(computeYDomain(undefined)).toEqual([0, 0]);
	});

	it('computes domain with 10% padding by default', () => {
		const data = [{ _min: 0, _max: 100 }, { _min: 10, _max: 200 }];
		// max: 200 + 200*0.1 = 220 → ceil = 220
		// min: 0 (positive, no padding) → floor = 0
		expect(computeYDomain(data)).toEqual([0, 220]);
	});

	it('pads negative min values', () => {
		const data = [{ _min: -100, _max: 50 }];
		// max: 50 + 50*0.1 = 55 → ceil = 55
		// min: -100 + (-100)*0.1 = -110 → floor = -110
		expect(computeYDomain(data)).toEqual([-110, 55]);
	});

	it('does not pad positive min values', () => {
		const data = [{ _min: 10, _max: 50 }];
		// max: 50 + 5 = 55 → ceil = 55
		// min: 10 (positive, no padding) → floor = 10
		expect(computeYDomain(data)).toEqual([10, 55]);
	});

	it('treats missing _min/_max as 0', () => {
		const data = [{ _max: 100 }, { _min: -50 }];
		// max: 100, min: -50
		expect(computeYDomain(data)).toEqual([-55, 110]);
	});

	it('handles all-zero data', () => {
		const data = [{ _min: 0, _max: 0 }, { _min: 0, _max: 0 }];
		expect(computeYDomain(data)).toEqual([0, 0]);
	});

	it('accepts custom padding', () => {
		const data = [{ _min: 0, _max: 100 }];
		// max: 100 + 100*0.2 = 120 → ceil = 120
		expect(computeYDomain(data, { padding: 0.2 })).toEqual([0, 120]);
	});

	it('handles large datasets without stack overflow', () => {
		const data = Array.from({ length: 500_000 }, (_, i) => ({
			_min: -i,
			_max: i
		}));
		const result = computeYDomain(data);
		expect(result[0]).toBeLessThan(0);
		expect(result[1]).toBeGreaterThan(0);
	});

	it('applies floor and ceil correctly for fractional values', () => {
		const data = [{ _min: -3.2, _max: 7.3 }];
		// max: 7.3 + 0.73 = 8.03 → ceil = 9
		// min: -3.2 + (-0.32) = -3.52 → floor = -4
		expect(computeYDomain(data)).toEqual([-4, 9]);
	});

	it('preserves the padded fractional value for sub-unit data', () => {
		// Sub-unit max (e.g. NPI dioxin reported in fractions of a kg). Without
		// this, Math.ceil(0.00187) = 1 which collapses the chart's y-domain.
		const data = [{ _min: 0, _max: 0.0017 }];
		const [min, max] = computeYDomain(data);
		expect(min).toBe(0);
		expect(max).toBeCloseTo(0.00187, 6);
	});
});
