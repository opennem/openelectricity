import { describe, it, expect } from 'vitest';
import { getPrimaryFuelTechGroup, isGasPeaker, isPumpedHydro } from './fuel-tech-group.js';

// ── getPrimaryFuelTechGroup ──────────────────────────────────────────

describe('getPrimaryFuelTechGroup', () => {
	it('returns "wind" for wind facility', () => {
		const units = [
			{ fueltech_id: 'wind', capacity_registered: 200 },
			{ fueltech_id: 'wind', capacity_registered: 200 }
		];
		expect(getPrimaryFuelTechGroup(units)).toBe('wind');
	});

	it('returns "wind" for offshore wind', () => {
		const units = [{ fueltech_id: 'wind_offshore', capacity_registered: 500 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('wind');
	});

	it('returns "solar" for solar_utility', () => {
		const units = [{ fueltech_id: 'solar_utility', capacity_registered: 300 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('solar');
	});

	it('returns "solar" for solar_rooftop', () => {
		const units = [{ fueltech_id: 'solar_rooftop', capacity_registered: 50 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('solar');
	});

	it('returns "battery" for battery units', () => {
		const units = [
			{ fueltech_id: 'battery_discharging', capacity_registered: 150 },
			{ fueltech_id: 'battery_charging', capacity_registered: 150 }
		];
		expect(getPrimaryFuelTechGroup(units)).toBe('battery');
	});

	it('returns "battery" for plain battery fueltech', () => {
		const units = [{ fueltech_id: 'battery', capacity_registered: 100 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('battery');
	});

	it('returns "coal" for black coal', () => {
		const units = [
			{ fueltech_id: 'coal_black', capacity_registered: 660 },
			{ fueltech_id: 'coal_black', capacity_registered: 660 }
		];
		expect(getPrimaryFuelTechGroup(units)).toBe('coal');
	});

	it('returns "coal" for brown coal', () => {
		const units = [{ fueltech_id: 'coal_brown', capacity_registered: 1400 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('coal');
	});

	it('returns "gas" for gas_ccgt', () => {
		const units = [{ fueltech_id: 'gas_ccgt', capacity_registered: 400 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('gas');
	});

	it('returns "gas" for gas_ocgt', () => {
		const units = [{ fueltech_id: 'gas_ocgt', capacity_registered: 160 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('gas');
	});

	it('returns "gas" for gas_recip', () => {
		const units = [{ fueltech_id: 'gas_recip', capacity_registered: 50 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('gas');
	});

	it('returns "gas" for gas_steam', () => {
		const units = [{ fueltech_id: 'gas_steam', capacity_registered: 200 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('gas');
	});

	it('returns "gas" for distillate', () => {
		const units = [{ fueltech_id: 'distillate', capacity_registered: 60 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('gas');
	});

	it('returns "hydro" for hydro units', () => {
		const units = [{ fueltech_id: 'hydro', capacity_registered: 600 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('hydro');
	});

	it('returns "hydro" for pumps units', () => {
		const units = [{ fueltech_id: 'pumps', capacity_registered: 500 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('hydro');
	});

	it('picks group with largest capacity when mixed', () => {
		const units = [
			{ fueltech_id: 'wind', capacity_registered: 100 },
			{ fueltech_id: 'solar_utility', capacity_registered: 300 }
		];
		expect(getPrimaryFuelTechGroup(units)).toBe('solar');
	});

	it('returns "other" for empty units', () => {
		expect(getPrimaryFuelTechGroup([])).toBe('other');
	});

	it('returns "other" for null/undefined', () => {
		expect(getPrimaryFuelTechGroup(null)).toBe('other');
		expect(getPrimaryFuelTechGroup(undefined)).toBe('other');
	});

	it('returns "other" for unknown fuel tech codes', () => {
		const units = [{ fueltech_id: 'bioenergy_biogas', capacity_registered: 10 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('other');
	});

	it('handles units with missing fueltech_id', () => {
		const units = [{ capacity_registered: 100 }];
		expect(getPrimaryFuelTechGroup(units)).toBe('other');
	});

	it('handles units with zero capacity', () => {
		const units = [
			{ fueltech_id: 'wind', capacity_registered: 0 },
			{ fueltech_id: 'solar_utility', capacity_registered: 100 }
		];
		expect(getPrimaryFuelTechGroup(units)).toBe('solar');
	});

	it('handles string capacity values from API', () => {
		const units = [
			{ fueltech_id: 'coal_black', capacity_registered: '350.0000' },
			{ fueltech_id: 'coal_black', capacity_registered: '350.0000' }
		];
		expect(getPrimaryFuelTechGroup(units)).toBe('coal');
	});

	it('handles mixed string capacities picking largest group', () => {
		const units = [
			{ fueltech_id: 'wind', capacity_registered: '100' },
			{ fueltech_id: 'solar_utility', capacity_registered: '300' }
		];
		expect(getPrimaryFuelTechGroup(units)).toBe('solar');
	});
});

// ── isGasPeaker ──────────────────────────────────────────────────────

describe('isGasPeaker', () => {
	it('returns true for OCGT facility', () => {
		const units = [{ fueltech_id: 'gas_ocgt', capacity_registered: 160 }];
		expect(isGasPeaker(units)).toBe(true);
	});

	it('returns true for reciprocating gas', () => {
		const units = [{ fueltech_id: 'gas_recip', capacity_registered: 50 }];
		expect(isGasPeaker(units)).toBe(true);
	});

	it('returns true for distillate', () => {
		const units = [{ fueltech_id: 'distillate', capacity_registered: 60 }];
		expect(isGasPeaker(units)).toBe(true);
	});

	it('returns false for CCGT facility', () => {
		const units = [{ fueltech_id: 'gas_ccgt', capacity_registered: 400 }];
		expect(isGasPeaker(units)).toBe(false);
	});

	it('returns false for gas steam', () => {
		const units = [{ fueltech_id: 'gas_steam', capacity_registered: 200 }];
		expect(isGasPeaker(units)).toBe(false);
	});

	it('returns true when peaker capacity dominates mixed facility', () => {
		const units = [
			{ fueltech_id: 'gas_ocgt', capacity_registered: 300 },
			{ fueltech_id: 'gas_ccgt', capacity_registered: 100 }
		];
		expect(isGasPeaker(units)).toBe(true);
	});

	it('returns false when CCGT dominates mixed facility', () => {
		const units = [
			{ fueltech_id: 'gas_ocgt', capacity_registered: 100 },
			{ fueltech_id: 'gas_ccgt', capacity_registered: 400 }
		];
		expect(isGasPeaker(units)).toBe(false);
	});

	it('returns false for empty units', () => {
		expect(isGasPeaker([])).toBe(false);
	});

	it('returns false for null/undefined', () => {
		expect(isGasPeaker(null)).toBe(false);
		expect(isGasPeaker(undefined)).toBe(false);
	});
});

// ── isPumpedHydro ────────────────────────────────────────────────────

describe('isPumpedHydro', () => {
	it('returns true when both hydro and pumps present', () => {
		const units = [
			{ fueltech_id: 'hydro' },
			{ fueltech_id: 'pumps' }
		];
		expect(isPumpedHydro(units)).toBe(true);
	});

	it('returns false for hydro only', () => {
		const units = [{ fueltech_id: 'hydro' }];
		expect(isPumpedHydro(units)).toBe(false);
	});

	it('returns false for pumps only', () => {
		const units = [{ fueltech_id: 'pumps' }];
		expect(isPumpedHydro(units)).toBe(false);
	});

	it('returns false for empty units', () => {
		expect(isPumpedHydro([])).toBe(false);
	});

	it('returns false for null/undefined', () => {
		expect(isPumpedHydro(null)).toBe(false);
		expect(isPumpedHydro(undefined)).toBe(false);
	});

	it('returns false for non-hydro units', () => {
		const units = [{ fueltech_id: 'wind' }, { fueltech_id: 'solar_utility' }];
		expect(isPumpedHydro(units)).toBe(false);
	});
});
