import { describe, expect, it } from 'vitest';
import {
	EMPTY_CELL,
	energyDisplayPrefix,
	formatTableEmissions,
	formatTableEnergy,
	formatTableIntensity,
	formatTablePercentage,
	formatTablePower,
	formatTablePrice,
	formatTrackerPercentageValue,
	splitTableLabel
} from './table-format.js';

describe('formatTablePower', () => {
	it('keeps one decimal strictly inside the displayed -10 to 10 range', () => {
		expect(formatTablePower(0, 'M')).toBe('0.0');
		expect(formatTablePower(9.94, 'M')).toBe('9.9');
		expect(formatTablePower(-9.94, 'M')).toBe('-9.9');
	});

	it('uses whole numbers at and beyond the displayed boundaries', () => {
		expect(formatTablePower(10, 'M')).toBe('10');
		expect(formatTablePower(-10, 'M')).toBe('-10');
		expect(formatTablePower(10.6, 'M')).toBe('11');
	});

	it('applies the threshold after SI-prefix conversion', () => {
		expect(formatTablePower(8500, 'G')).toBe('8.5');
		expect(formatTablePower(12_500, 'G')).toBe('13');
		expect(formatTablePower(9_000_000, 'T')).toBe('9.0');
	});

	it('uses an em dash for missing or invalid values', () => {
		expect(formatTablePower(null, 'M')).toBe(EMPTY_CELL);
		expect(formatTablePower(NaN, 'M')).toBe(EMPTY_CELL);
	});
});

describe('formatTablePercentage', () => {
	it('always renders exactly one decimal place', () => {
		expect(formatTablePercentage(0)).toBe('0.0%');
		expect(formatTablePercentage(10)).toBe('10.0%');
		expect(formatTablePercentage(10.05)).toBe('10.1%');
	});

	it('uses an em dash for missing or invalid values', () => {
		expect(formatTablePercentage(null)).toBe(EMPTY_CELL);
		expect(formatTablePercentage(NaN)).toBe(EMPTY_CELL);
	});
});

describe('formatTrackerPercentageValue', () => {
	it('keeps one decimal while leaving the unit to the tooltip', () => {
		expect(formatTrackerPercentageValue(10)).toBe('10.0');
		expect(formatTrackerPercentageValue(67.89)).toBe('67.9');
	});
});

describe('formatTablePrice', () => {
	it('always shows cents', () => {
		expect(formatTablePrice(2)).toBe('$2.00');
		expect(formatTablePrice(-48.5)).toBe('$-48.50');
	});

	it('uses an em dash for missing or invalid values', () => {
		expect(formatTablePrice(null)).toBe(EMPTY_CELL);
		expect(formatTablePrice(NaN)).toBe(EMPTY_CELL);
	});
});

describe('splitTableLabel', () => {
	it('separates a parenthesised qualifier from the name', () => {
		expect(splitTableLabel('Battery (Charging)')).toEqual({ main: 'Battery', sub: '(Charging)' });
		expect(splitTableLabel('Coal')).toEqual({ main: 'Coal', sub: '' });
	});

	it('keeps every qualifier after the first', () => {
		expect(splitTableLabel('Gas (OCGT) (Peaking)')).toEqual({
			main: 'Gas',
			sub: '(OCGT) (Peaking)'
		});
	});
});

describe('energy formatting', () => {
	it('steps the column prefix up only at five digits, visiting GWh before TWh', () => {
		expect(energyDisplayPrefix(9_999)).toBe('M');
		expect(energyDisplayPrefix(10_000)).toBe('G');
		expect(energyDisplayPrefix(3_600_000)).toBe('G'); // 3,600 GWh, not 3.6 TWh
		expect(energyDisplayPrefix(10_000_000)).toBe('T');
	});

	it('formats MWh in the column prefix with the power precision rule', () => {
		expect(formatTableEnergy(292_000, 'G')).toBe('292');
		expect(formatTableEnergy(3_600_000, 'G')).toBe('3,600');
		expect(formatTableEnergy(39_000_000, 'T')).toBe('39');
		expect(formatTableEnergy(null, 'G')).toBe(EMPTY_CELL);
	});
});

describe('emissions formatting', () => {
	it('formats plain tonnes with the power precision rule, never scaling to kt/Mt', () => {
		expect(formatTableEmissions(7.25)).toBe('7.3');
		expect(formatTableEmissions(300)).toBe('300');
		expect(formatTableEmissions(8_500)).toBe('8,500');
		expect(formatTableEmissions(1_234_567)).toBe('1,234,567');
		expect(formatTableEmissions(null)).toBe(EMPTY_CELL);
	});

	it('formats intensity with one decimal below ten', () => {
		expect(formatTableIntensity(0)).toBe('0.0');
		expect(formatTableIntensity(7.25)).toBe('7.3');
		expect(formatTableIntensity(812.4)).toBe('812');
		expect(formatTableIntensity(null)).toBe(EMPTY_CELL);
	});
});
