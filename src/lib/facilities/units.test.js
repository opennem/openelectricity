import { describe, it, expect } from 'vitest';
import {
	canSplitBatteryUnits,
	getFacilityCapacity,
	getOrderedFuelTechGroups,
	groupUnits,
	withBatteryView
} from './units.js';

describe('getFacilityCapacity', () => {
	it('sums per-unit capacity net of derived battery charge/discharge units', () => {
		const facility = {
			units: [
				{ fueltech_id: 'battery', capacity_maximum: 100 },
				{ fueltech_id: 'battery_charging', capacity_maximum: 100 },
				{ fueltech_id: 'battery_discharging', capacity_maximum: 100 },
				{ fueltech_id: 'solar_utility', capacity_registered: 50 }
			]
		};
		expect(getFacilityCapacity(facility)).toBe(150);
	});

	it('returns 0 for a facility with no units', () => {
		expect(getFacilityCapacity({})).toBe(0);
		expect(getFacilityCapacity(null)).toBe(0);
	});
});

describe('groupUnits', () => {
	it('applies the max→registered fallback per unit when summing totalCapacity', () => {
		const facility = {
			units: [
				{ fueltech_id: 'wind', status_id: 'operating', capacity_maximum: 100 },
				// Registered-only unit — a group-level fallback (sum(max) || sum(reg))
				// would ignore this unit's 50 MW and report 100.
				{ fueltech_id: 'wind', status_id: 'operating', capacity_registered: 50 }
			]
		};
		const [group] = groupUnits(facility);
		expect(group.totalCapacity).toBe(150);
	});

	it('prefers maximum over registered within a unit', () => {
		const facility = {
			units: [
				{
					fueltech_id: 'wind',
					status_id: 'operating',
					capacity_maximum: 120,
					capacity_registered: 100
				}
			]
		};
		const [group] = groupUnits(facility);
		expect(group.totalCapacity).toBe(120);
	});
});

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

describe('withBatteryView', () => {
	it('preserves a native commissioning status', () => {
		const facility = {
			units: [
				{
					fueltech_id: 'solar_utility',
					status_id: 'commissioning',
					capacity_maximum: 100,
					max_generation: 40
				}
			]
		};
		const [unit] = withBatteryView(facility).units;
		expect(unit.status_id).toBe('commissioning');
	});

	it('does not infer commissioning from an operating unit with low maximum generation', () => {
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
		const [unit] = withBatteryView(facility).units;
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
		expect(withBatteryView(facility).units.map((/** @type {any} */ u) => u.fueltech_id)).toEqual([
			'battery'
		]);
	});

	it('keeps the split units and drops the bidirectional battery in split view', () => {
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
		expect(
			withBatteryView(facility, { batteryView: 'split' }).units.map(
				(/** @type {any} */ u) => u.fueltech_id
			)
		).toEqual(['battery_charging', 'battery_discharging']);
	});

	it('preserves native statuses in split view', () => {
		const facility = {
			units: [
				{
					fueltech_id: 'battery',
					status_id: 'operating',
					capacity_maximum: 100,
					max_generation: 100
				},
				{
					fueltech_id: 'battery_charging',
					status_id: 'commissioning',
					capacity_maximum: 100,
					max_generation: 10
				}
			]
		};
		const [unit] = withBatteryView(facility, { batteryView: 'split' }).units;
		expect(unit.status_id).toBe('commissioning');
	});

	it('ignores split view for facilities without a bidirectional battery', () => {
		const facility = {
			units: [
				{ fueltech_id: 'battery_charging', status_id: 'operating', capacity_maximum: 100 },
				{ fueltech_id: 'battery_discharging', status_id: 'operating', capacity_maximum: 100 }
			]
		};
		expect(
			withBatteryView(facility, { batteryView: 'split' }).units.map(
				(/** @type {any} */ u) => u.fueltech_id
			)
		).toEqual(['battery_charging', 'battery_discharging']);
	});

	it('returns the facility unchanged when it has no units', () => {
		const facility = { code: 'X' };
		expect(withBatteryView(facility)).toBe(facility);
	});

	it('does not mutate the input facility', () => {
		const facility = /** @type {any} */ ({
			units: [
				{
					fueltech_id: 'solar_utility',
					status_id: 'operating',
					capacity_maximum: 100,
					max_generation: 40
				}
			]
		});
		const result = withBatteryView(facility);
		expect(result).not.toBe(facility);
		expect(result.units[0]).toBe(facility.units[0]);
		expect(facility.units[0].status_id).toBe('operating');
	});
});

describe('canSplitBatteryUnits', () => {
	it('is true when a bidirectional battery has derived split units', () => {
		const facility = {
			units: [
				{ fueltech_id: 'battery', status_id: 'operating' },
				{ fueltech_id: 'battery_charging', status_id: 'operating' },
				{ fueltech_id: 'battery_discharging', status_id: 'operating' }
			]
		};
		expect(canSplitBatteryUnits(facility)).toBe(true);
	});

	it('is false for a bidirectional battery without split units', () => {
		const facility = {
			units: [
				{ fueltech_id: 'battery', status_id: 'operating' },
				{ fueltech_id: 'solar_utility', status_id: 'operating' }
			]
		};
		expect(canSplitBatteryUnits(facility)).toBe(false);
	});

	it('is false for native charge/discharge units with no bidirectional battery', () => {
		const facility = {
			units: [
				{ fueltech_id: 'battery_charging', status_id: 'operating' },
				{ fueltech_id: 'battery_discharging', status_id: 'operating' }
			]
		};
		expect(canSplitBatteryUnits(facility)).toBe(false);
	});

	it('is false with no units', () => {
		expect(canSplitBatteryUnits({ units: [] })).toBe(false);
		expect(canSplitBatteryUnits(null)).toBe(false);
	});
});
