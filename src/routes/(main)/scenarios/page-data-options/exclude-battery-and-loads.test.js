import { describe, it, expect } from 'vitest';
import excludeBatteryAndLoads from './exclude-battery-and-loads.js';

describe('excludeBatteryAndLoads', () => {
	// Mirrors the group-key structure of the simple/detailed scenario groups.
	const groupKeys = {
		storage_charging: ['battery_charging', 'pumps'],
		storage_discharging: ['battery', 'battery_discharging'],
		exports: ['exports'],
		coal: ['coal_black', 'coal_brown'],
		gas: ['gas_ccgt'],
		wind: ['wind'],
		solar_utility: ['solar_utility']
	};

	const result = excludeBatteryAndLoads(groupKeys);

	it('keeps battery discharging — it is generation and always shown', () => {
		expect(result).toHaveProperty('storage_discharging');
		expect(result.storage_discharging).toEqual(groupKeys.storage_discharging);
	});

	it('removes storage charging and exports (loads gated by the toggle)', () => {
		expect(result).not.toHaveProperty('storage_charging');
		expect(result).not.toHaveProperty('exports');
	});

	it('keeps all non-load generation sources', () => {
		expect(result).toHaveProperty('coal');
		expect(result).toHaveProperty('gas');
		expect(result).toHaveProperty('wind');
		expect(result).toHaveProperty('solar_utility');
	});

	it('does not mutate the input', () => {
		expect(groupKeys).toHaveProperty('storage_charging');
		expect(groupKeys).toHaveProperty('exports');
	});
});
