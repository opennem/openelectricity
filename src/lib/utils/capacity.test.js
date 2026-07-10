import { describe, it, expect } from 'vitest';
import {
	getUnitCapacity,
	getUnitCapacitySource,
	pickCapacity,
	sumUnitCapacities
} from './capacity.js';

describe('pickCapacity', () => {
	it('prefers maximum, falling back to registered on 0/null/non-numeric', () => {
		expect(pickCapacity(120, 100)).toBe(120);
		expect(pickCapacity(0, 100)).toBe(100);
		expect(pickCapacity(null, 100)).toBe(100);
		expect(pickCapacity('n/a', 100)).toBe(100);
		expect(pickCapacity(undefined, undefined)).toBe(0);
	});
});

describe('getUnitCapacity', () => {
	it('prefers capacity_maximum when present', () => {
		expect(getUnitCapacity({ capacity_maximum: 120, capacity_registered: 100 })).toBe(120);
	});

	it('falls back to capacity_registered when maximum is missing', () => {
		expect(getUnitCapacity({ capacity_registered: 100 })).toBe(100);
	});

	it('falls back to registered when maximum is 0, null or non-numeric', () => {
		expect(getUnitCapacity({ capacity_maximum: 0, capacity_registered: 100 })).toBe(100);
		expect(getUnitCapacity({ capacity_maximum: null, capacity_registered: 100 })).toBe(100);
		expect(getUnitCapacity({ capacity_maximum: 'n/a', capacity_registered: 100 })).toBe(100);
	});

	it('coerces numeric strings', () => {
		expect(getUnitCapacity({ capacity_maximum: '120.5' })).toBe(120.5);
	});

	it('returns 0 when both fields are absent, or the unit is nullish', () => {
		expect(getUnitCapacity({})).toBe(0);
		expect(getUnitCapacity(null)).toBe(0);
		expect(getUnitCapacity(undefined)).toBe(0);
	});
});

describe('sumUnitCapacities', () => {
	it('applies the fallback per unit before summing', () => {
		const units = [{ capacity_maximum: 100, capacity_registered: 90 }, { capacity_registered: 50 }];
		// Group-level fallback (sum(max) || sum(reg)) would give 100.
		expect(sumUnitCapacities(units)).toBe(150);
	});

	it('ignores units with no capacity data', () => {
		expect(sumUnitCapacities([{ capacity_maximum: 100 }, {}, null])).toBe(100);
	});

	it('returns 0 for empty or nullish input', () => {
		expect(sumUnitCapacities([])).toBe(0);
		expect(sumUnitCapacities(null)).toBe(0);
		expect(sumUnitCapacities(undefined)).toBe(0);
	});
});

describe('getUnitCapacitySource', () => {
	it('reports which field getUnitCapacity used', () => {
		expect(getUnitCapacitySource({ capacity_maximum: 120, capacity_registered: 100 })).toBe(
			'maximum'
		);
		expect(getUnitCapacitySource({ capacity_maximum: 0, capacity_registered: 100 })).toBe(
			'registered'
		);
		expect(getUnitCapacitySource({})).toBe(null);
		expect(getUnitCapacitySource(null)).toBe(null);
	});
});
