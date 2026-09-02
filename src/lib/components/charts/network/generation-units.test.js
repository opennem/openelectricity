import { describe, expect, it } from 'vitest';
import {
	automaticGenerationEnergyPrefix,
	formatGenerationUnitValue,
	generationUnitMaximumFractionDigits
} from './generation-units.js';

describe('formatGenerationUnitValue', () => {
	it('uses one decimal only strictly inside the displayed -10 to 10 range', () => {
		expect(formatGenerationUnitValue(9_940, 'M', 'G')).toBe('9.9');
		expect(formatGenerationUnitValue(-9_940, 'M', 'G')).toBe('-9.9');
		expect(formatGenerationUnitValue(10_000, 'M', 'G')).toBe('10');
		expect(formatGenerationUnitValue(-10_000, 'M', 'G')).toBe('-10');
		expect(formatGenerationUnitValue(10_600, 'M', 'G')).toBe('11');
	});

	it('retains a trailing decimal for small whole values and rejects invalid values', () => {
		expect(formatGenerationUnitValue(5_000, 'M', 'G')).toBe('5.0');
		expect(formatGenerationUnitValue(null, 'M', 'G')).toBe('—');
		expect(formatGenerationUnitValue(NaN, 'M', 'G')).toBe('—');
	});
});

describe('automaticGenerationEnergyPrefix', () => {
	it('keeps five-digit generation totals in MWh', () => {
		expect(
			automaticGenerationEnergyPrefix([{ coal: 60_000, wind: 39_999 }], ['coal', 'wind'])
		).toBe('M');
	});

	it('promotes the first six-digit generation total to TWh', () => {
		expect(
			automaticGenerationEnergyPrefix([{ coal: 60_000, wind: 40_000 }], ['coal', 'wind'])
		).toBe('T');
	});

	it('ignores negative load series when measuring the generation stack', () => {
		expect(
			automaticGenerationEnergyPrefix(
				[{ generation: 100_000, battery_charging: -30_000 }],
				['generation', 'battery_charging']
			)
		).toBe('T');
	});
});

describe('generationUnitMaximumFractionDigits', () => {
	it('uses whole M-units and preserves precision for larger prefixes', () => {
		expect(generationUnitMaximumFractionDigits('M')).toBe(0);
		expect(generationUnitMaximumFractionDigits('G')).toBe(2);
		expect(generationUnitMaximumFractionDigits('T')).toBe(2);
	});
});
