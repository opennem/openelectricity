import { describe, it, expect } from 'vitest';
import { toGroup, getPrimaryFuelTechGroup, isGasPeaker, isPumpedHydro } from './fuel-group.js';

describe('toGroup', () => {
	it('maps wind variants', () => {
		expect(toGroup('wind')).toBe('wind');
		expect(toGroup('wind_offshore')).toBe('wind');
	});

	it('maps solar variants by prefix', () => {
		expect(toGroup('solar_utility')).toBe('solar');
		expect(toGroup('solar_rooftop')).toBe('solar');
	});

	it('maps battery variants', () => {
		expect(toGroup('battery')).toBe('battery');
		expect(toGroup('battery_charging')).toBe('battery');
		expect(toGroup('battery_discharging')).toBe('battery');
	});

	it('maps coal by prefix', () => {
		expect(toGroup('coal_black')).toBe('coal');
		expect(toGroup('coal_brown')).toBe('coal');
	});

	it('maps gas variants and distillate', () => {
		expect(toGroup('gas_ccgt')).toBe('gas');
		expect(toGroup('gas_ocgt')).toBe('gas');
		expect(toGroup('distillate')).toBe('gas');
	});

	it('maps hydro and pumps', () => {
		expect(toGroup('hydro')).toBe('hydro');
		expect(toGroup('pumps')).toBe('hydro');
	});

	it('falls back to other', () => {
		expect(toGroup('bioenergy_biomass')).toBe('other');
		expect(toGroup('')).toBe('other');
	});
});

describe('getPrimaryFuelTechGroup', () => {
	it('returns other for no units', () => {
		expect(getPrimaryFuelTechGroup([])).toBe('other');
		expect(getPrimaryFuelTechGroup(/** @type {any} */ (undefined))).toBe('other');
	});

	it('picks the dominant group by registered capacity', () => {
		const units = [
			{ fueltech_id: 'solar_utility', capacity_registered: 50 },
			{ fueltech_id: 'battery', capacity_registered: 30 }
		];
		expect(getPrimaryFuelTechGroup(units)).toBe('solar');
	});

	it('prefers maximum capacity over registered when weighing dominance', () => {
		const units = [
			// Registered alone would make solar dominant; maximum flips it to battery.
			{ fueltech_id: 'solar_utility', capacity_registered: 50, capacity_maximum: 40 },
			{ fueltech_id: 'battery', capacity_registered: 30, capacity_maximum: 60 }
		];
		expect(getPrimaryFuelTechGroup(units)).toBe('battery');
	});

	it('sums capacity within a group across units', () => {
		const units = [
			{ fueltech_id: 'gas_ocgt', capacity_registered: 40 },
			{ fueltech_id: 'gas_ccgt', capacity_registered: 40 },
			{ fueltech_id: 'hydro', capacity_registered: 70 }
		];
		expect(getPrimaryFuelTechGroup(units)).toBe('gas');
	});

	it('handles missing capacity as zero', () => {
		const units = [{ fueltech_id: 'wind' }, { fueltech_id: 'coal_black', capacity_registered: 10 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('coal');
	});
});

describe('isGasPeaker', () => {
	it('is true when majority capacity is OCGT/recip/distillate', () => {
		const units = [
			{ fueltech_id: 'gas_ocgt', capacity_registered: 80 },
			{ fueltech_id: 'gas_ccgt', capacity_registered: 20 }
		];
		expect(isGasPeaker(units)).toBe(true);
	});

	it('is false when majority is CCGT', () => {
		const units = [
			{ fueltech_id: 'gas_ocgt', capacity_registered: 20 },
			{ fueltech_id: 'gas_ccgt', capacity_registered: 80 }
		];
		expect(isGasPeaker(units)).toBe(false);
	});

	it('is false for no units', () => {
		expect(isGasPeaker([])).toBe(false);
	});
});

describe('isPumpedHydro', () => {
	it('is true with both hydro and pump units', () => {
		expect(isPumpedHydro([{ fueltech_id: 'hydro' }, { fueltech_id: 'pumps' }])).toBe(true);
	});

	it('is false with only hydro', () => {
		expect(isPumpedHydro([{ fueltech_id: 'hydro' }])).toBe(false);
	});

	it('is false for no units', () => {
		expect(isPumpedHydro([])).toBe(false);
	});
});
