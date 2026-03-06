import { describe, it, expect } from 'vitest';
import { computeUnitAvailability } from './unit-availability.js';

describe('computeUnitAvailability', () => {
	it('calculates percentage of intervals with power > 0', () => {
		const rows = [
			{ power_UNIT1: 100 },
			{ power_UNIT1: 0 },
			{ power_UNIT1: 50 },
			{ power_UNIT1: 0 }
		];

		const result = computeUnitAvailability(rows, ['power_UNIT1']);
		expect(result).toHaveLength(1);
		expect(result[0].unit).toBe('UNIT1');
		expect(result[0].availability).toBe(50); // 2/4 = 50%
	});

	it('handles multiple units', () => {
		const rows = [
			{ power_U1: 100, power_U2: 0 },
			{ power_U1: 100, power_U2: 50 },
			{ power_U1: 0, power_U2: 50 },
			{ power_U1: 100, power_U2: 50 }
		];

		const result = computeUnitAvailability(rows, ['power_U1', 'power_U2']);
		expect(result[0].unit).toBe('U1');
		expect(result[0].availability).toBe(75); // 3/4
		expect(result[1].unit).toBe('U2');
		expect(result[1].availability).toBe(75); // 3/4
	});

	it('returns 100% when always generating', () => {
		const rows = [{ power_UNIT1: 100 }, { power_UNIT1: 200 }, { power_UNIT1: 50 }];
		const result = computeUnitAvailability(rows, ['power_UNIT1']);
		expect(result[0].availability).toBe(100);
	});

	it('returns 0% when never generating', () => {
		const rows = [{ power_UNIT1: 0 }, { power_UNIT1: 0 }];
		const result = computeUnitAvailability(rows, ['power_UNIT1']);
		expect(result[0].availability).toBe(0);
	});

	it('skips null/undefined values', () => {
		const rows = [
			{ power_UNIT1: 100 },
			{ power_UNIT1: null },
			{ power_UNIT1: undefined },
			{ power_UNIT1: 50 }
		];

		const result = computeUnitAvailability(rows, ['power_UNIT1']);
		// Only 2 valid rows with value > 0 out of 2 non-null rows
		expect(result[0].availability).toBe(100); // 2/2
	});

	it('strips energy_ prefix too', () => {
		const rows = [{ energy_UNIT1: 100 }];
		const result = computeUnitAvailability(rows, ['energy_UNIT1']);
		expect(result[0].unit).toBe('UNIT1');
	});

	it('returns empty array for empty rows', () => {
		expect(computeUnitAvailability([], ['power_UNIT1'])).toEqual([]);
	});

	it('returns empty array for empty series names', () => {
		expect(computeUnitAvailability([{ power_UNIT1: 100 }], [])).toEqual([]);
	});

	it('preserves series name in result', () => {
		const rows = [{ power_UNIT1: 100 }];
		const result = computeUnitAvailability(rows, ['power_UNIT1']);
		expect(result[0].seriesName).toBe('power_UNIT1');
	});
});
