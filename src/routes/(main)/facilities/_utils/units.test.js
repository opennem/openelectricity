import { describe, it, expect } from 'vitest';
import { getOrderedFuelTechGroups } from './units.js';

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
