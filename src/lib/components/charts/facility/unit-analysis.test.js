import { describe, it, expect } from 'vitest';
import { analyzeUnits, compareUnitsByLabel, unitsKeyFor, unitSeriesIds } from './unit-analysis.js';

describe('unitsKeyFor', () => {
	it('is stable regardless of key insertion order', () => {
		expect(unitsKeyFor({ B: 'coal_black', A: 'coal_black' })).toBe(
			unitsKeyFor({ A: 'coal_black', B: 'coal_black' })
		);
	});

	it('differs when the unit set differs', () => {
		expect(unitsKeyFor({ A: 'battery' })).not.toBe(
			unitsKeyFor({ 'A-C': 'battery_charging', 'A-D': 'battery_discharging' })
		);
	});

	it('is empty for an empty map', () => {
		expect(unitsKeyFor({})).toBe('');
	});
});

describe('unitSeriesIds', () => {
	it('prefixes each code with the metric', () => {
		expect(unitSeriesIds('market_value', ['BW01', 'BW02'])).toEqual([
			'market_value_BW01',
			'market_value_BW02'
		]);
	});

	it('returns an empty list for no codes', () => {
		expect(unitSeriesIds('power', [])).toEqual([]);
	});
});

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
	it('orders orderedCodes by label within a fuel tech', () => {
		const facility = {
			units: [
				{ code: 'ER03', fueltech_id: 'coal_black' },
				{ code: 'ER01', fueltech_id: 'coal_black' },
				{ code: 'ER02', fueltech_id: 'coal_black' }
			]
		};
		const { orderedCodes } = analyzeUnits(facility, getColour);
		expect(orderedCodes).toEqual(['ER01', 'ER02', 'ER03']);
	});

	it('keeps fuel-tech order primary, label as the tie-break', () => {
		const facility = {
			units: [
				{ code: 'SF2', fueltech_id: 'solar_utility' },
				{ code: 'B1', fueltech_id: 'battery_charging' },
				{ code: 'SF1', fueltech_id: 'solar_utility' }
			]
		};
		const { orderedCodes } = analyzeUnits(facility, getColour);
		// Same fuel-tech grouping as before, but SF1 now precedes SF2.
		const solarCodes = orderedCodes.filter((code) => code.startsWith('SF'));
		expect(solarCodes).toEqual(['SF1', 'SF2']);
		expect(orderedCodes).toHaveLength(3);
	});
});

describe('analyzeUnits load codes', () => {
	it('collects bare unit codes for load fuel techs only', () => {
		const facility = {
			units: [
				{ code: 'BESS_G', fueltech_id: 'battery_discharging' },
				{ code: 'BESS_L', fueltech_id: 'battery_charging' },
				{ code: 'PUMP1', fueltech_id: 'pumps' }
			]
		};
		const { loadCodes } = analyzeUnits(facility, getColour);
		expect(loadCodes).toEqual(expect.arrayContaining(['BESS_L', 'PUMP1']));
		expect(loadCodes).not.toContain('BESS_G');
	});
});
