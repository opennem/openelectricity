import { describe, expect, it } from 'vitest';
import {
	EMPTY_CELL,
	emissionsDisplayPrefix,
	formatTableEmissions,
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

describe('emissions formatting', () => {
	it('picks one column prefix from the largest value', () => {
		expect(emissionsDisplayPrefix(999)).toBe('');
		expect(emissionsDisplayPrefix(1_000)).toBe('k');
		expect(emissionsDisplayPrefix(2_500_000)).toBe('M');
	});

	it('formats tonnes in the column prefix with the power precision rule', () => {
		expect(formatTableEmissions(300, '')).toBe('300');
		expect(formatTableEmissions(8_500, 'k')).toBe('8.5');
		expect(formatTableEmissions(1_234_567, 'M')).toBe('1.2');
		expect(formatTableEmissions(null, 'k')).toBe(EMPTY_CELL);
	});

	it('formats intensity with one decimal below ten', () => {
		expect(formatTableIntensity(0)).toBe('0.0');
		expect(formatTableIntensity(7.25)).toBe('7.3');
		expect(formatTableIntensity(812.4)).toBe('812');
		expect(formatTableIntensity(null)).toBe(EMPTY_CELL);
	});
});
