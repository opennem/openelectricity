import { describe, expect, it } from 'vitest';
import { TABLE_UNIT_CYCLES, nextTableUnitPrefix } from './table-units.js';

describe('table unit cycles', () => {
	it('steps through each column’s prefixes and wraps', () => {
		expect(nextTableUnitPrefix('energy', 'M')).toBe('G');
		expect(nextTableUnitPrefix('energy', 'G')).toBe('T');
		expect(nextTableUnitPrefix('energy', 'T')).toBe('M');
		expect(nextTableUnitPrefix('power', 'G')).toBe('M');
		expect(nextTableUnitPrefix('emissions', '')).toBe('k');
		expect(nextTableUnitPrefix('emissions', 'M')).toBe('');
		expect(nextTableUnitPrefix('intensity', 'k')).toBe('M');
	});

	it('starts an unlisted prefix from the first entry', () => {
		expect(nextTableUnitPrefix('power', 'T')).toBe('M');
	});

	it('labels each prefix', () => {
		expect(TABLE_UNIT_CYCLES.energy.label('G')).toBe('GWh');
		expect(TABLE_UNIT_CYCLES.power.label('M')).toBe('MW');
		expect(TABLE_UNIT_CYCLES.emissions.label('k')).toBe('ktCO₂e');
		expect(TABLE_UNIT_CYCLES.intensity.label('k')).toBe('kgCO₂e/MWh');
		expect(TABLE_UNIT_CYCLES.intensity.label('M')).toBe('tCO₂e/MWh');
	});
});
