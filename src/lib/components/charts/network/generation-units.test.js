import { describe, expect, it } from 'vitest';
import {
	automaticGenerationEnergyPrefix,
	generationUnitMaximumFractionDigits
} from './generation-units.js';

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
