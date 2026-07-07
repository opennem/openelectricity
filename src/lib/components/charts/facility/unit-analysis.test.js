import { describe, it, expect } from 'vitest';
import { analyzeUnits, compareUnitsByLabel } from './unit-analysis.js';

const getColour = () => '#888888';

describe('compareUnitsByLabel', () => {
	it('orders by code alphabetically', () => {
		const units = [{ code: 'BW03' }, { code: 'BW01' }, { code: 'BW02' }];
		expect(units.sort(compareUnitsByLabel).map((u) => u.code)).toEqual(['BW01', 'BW02', 'BW03']);
	});

	it('is numeric-aware (GT2 before GT10)', () => {
		const units = [{ code: 'GT10' }, { code: 'GT2' }, { code: 'GT1' }];
		expect(units.sort(compareUnitsByLabel).map((u) => u.code)).toEqual(['GT1', 'GT2', 'GT10']);
	});

	it('prefers the display code over the raw code', () => {
		const units = [
			{ code: 'ZZZ_INTERNAL', code_display: 'A1' },
			{ code: 'AAA_INTERNAL', code_display: 'B2' }
		];
		expect(units.sort(compareUnitsByLabel).map((u) => u.code_display)).toEqual(['A1', 'B2']);
	});
});

describe('analyzeUnits unit ordering', () => {
	it('orders unitOrder by label within a fuel tech', () => {
		const facility = {
			units: [
				{ code: 'ER03', fueltech_id: 'coal_black' },
				{ code: 'ER01', fueltech_id: 'coal_black' },
				{ code: 'ER02', fueltech_id: 'coal_black' }
			]
		};
		const { unitOrder } = analyzeUnits(facility, getColour);
		expect(unitOrder).toEqual(['power_ER01', 'power_ER02', 'power_ER03']);
	});

	it('keeps fuel-tech order primary, label as the tie-break', () => {
		const facility = {
			units: [
				{ code: 'SF2', fueltech_id: 'solar_utility' },
				{ code: 'B1', fueltech_id: 'battery_charging' },
				{ code: 'SF1', fueltech_id: 'solar_utility' }
			]
		};
		const { unitOrder } = analyzeUnits(facility, getColour);
		// Same fuel-tech grouping as before, but SF1 now precedes SF2.
		const solarIds = unitOrder.filter((id) => id.startsWith('power_SF'));
		expect(solarIds).toEqual(['power_SF1', 'power_SF2']);
		expect(unitOrder).toHaveLength(3);
	});
});
