import { describe, it, expect } from 'vitest';
import { getOrderedFuelTechGroups, withMarkedUnits } from './units.js';

describe('getOrderedFuelTechGroups', () => {
	it('orders top-of-stack first (reversed detailed order) and dedupes by fueltech_id', () => {
		const facility = {
			units: [
				{ fueltech_id: 'battery', capacity_maximum: 30, status_id: 'operating' },
				{ fueltech_id: 'solar_utility', capacity_maximum: 100, status_id: 'operating' },
				{ fueltech_id: 'hydro', capacity_maximum: 50, status_id: 'operating' },
				// Same fueltech, different status — collapses to one badge.
				{ fueltech_id: 'solar_utility', capacity_maximum: 40, status_id: 'committed' }
			]
		};
		expect(getOrderedFuelTechGroups(facility).map((g) => g.fueltech_id)).toEqual([
			'solar_utility',
			'hydro',
			'battery'
		]);
	});

	it('skips derived battery_charging/discharging when a bidirectional battery exists', () => {
		const facility = {
			units: [
				{ fueltech_id: 'battery', capacity_maximum: 100, status_id: 'operating' },
				{ fueltech_id: 'battery_charging', capacity_maximum: 100, status_id: 'operating' },
				{ fueltech_id: 'battery_discharging', capacity_maximum: 100, status_id: 'operating' }
			]
		};
		expect(getOrderedFuelTechGroups(facility).map((g) => g.fueltech_id)).toEqual(['battery']);
	});

	it('returns an empty array for a facility with no units', () => {
		expect(getOrderedFuelTechGroups({ units: [] })).toEqual([]);
		expect(getOrderedFuelTechGroups(null)).toEqual([]);
	});
});

describe('withMarkedUnits', () => {
	it('marks an operating unit below 90% of capacity as commissioning', () => {
		const facility = {
			units: [
				{
					fueltech_id: 'solar_utility',
					status_id: 'operating',
					capacity_maximum: 100,
					max_generation: 40
				}
			]
		};
		const [unit] = withMarkedUnits(facility).units;
		expect(unit.isCommissioning).toBe(true);
		expect(unit.status_id).toBe('commissioning');
	});

	it('leaves a fully operating unit (>90%) untouched', () => {
		const facility = {
			units: [
				{
					fueltech_id: 'coal_black',
					status_id: 'operating',
					capacity_maximum: 100,
					max_generation: 95
				}
			]
		};
		const [unit] = withMarkedUnits(facility).units;
		expect(unit.isCommissioning).toBeUndefined();
		expect(unit.status_id).toBe('operating');
	});

	it('drops derived battery_charging/discharging when a bidirectional battery exists', () => {
		const facility = {
			units: [
				{
					fueltech_id: 'battery',
					status_id: 'operating',
					capacity_maximum: 100,
					max_generation: 100
				},
				{ fueltech_id: 'battery_charging', status_id: 'operating', capacity_maximum: 100 },
				{ fueltech_id: 'battery_discharging', status_id: 'operating', capacity_maximum: 100 }
			]
		};
		expect(withMarkedUnits(facility).units.map((u) => u.fueltech_id)).toEqual(['battery']);
	});

	it('returns the facility unchanged when it has no units', () => {
		const facility = { code: 'X' };
		expect(withMarkedUnits(facility)).toBe(facility);
	});

	it('does not mutate the input units', () => {
		const facility = {
			units: [
				{
					fueltech_id: 'solar_utility',
					status_id: 'operating',
					capacity_maximum: 100,
					max_generation: 40
				}
			]
		};
		withMarkedUnits(facility);
		expect(facility.units[0].status_id).toBe('operating');
		expect(facility.units[0].isCommissioning).toBeUndefined();
	});
});
