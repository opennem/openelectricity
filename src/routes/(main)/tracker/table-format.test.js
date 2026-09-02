import { describe, expect, it } from 'vitest';
import {
	formatTablePercentage,
	formatTablePower,
	formatTrackerPercentageValue
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
		expect(formatTablePower(null, 'M')).toBe('—');
		expect(formatTablePower(NaN, 'M')).toBe('—');
	});
});

describe('formatTablePercentage', () => {
	it('always renders exactly one decimal place', () => {
		expect(formatTablePercentage(0)).toBe('0.0%');
		expect(formatTablePercentage(10)).toBe('10.0%');
		expect(formatTablePercentage(10.05)).toBe('10.1%');
	});

	it('uses an em dash for missing or invalid values', () => {
		expect(formatTablePercentage(null)).toBe('—');
		expect(formatTablePercentage(NaN)).toBe('—');
	});
});

describe('formatTrackerPercentageValue', () => {
	it('keeps one decimal while leaving the unit to the tooltip', () => {
		expect(formatTrackerPercentageValue(10)).toBe('10.0');
		expect(formatTrackerPercentageValue(67.89)).toBe('67.9');
	});
});
