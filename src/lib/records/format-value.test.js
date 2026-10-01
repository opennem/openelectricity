import { describe, expect, it } from 'vitest';
import { formatRecordValue, recordFractionDigits } from './format-value.js';

describe('formatRecordValue', () => {
	it('shows proportions to one decimal place', () => {
		expect(formatRecordValue(82.58, '%')).toBe('82.6');
		expect(formatRecordValue(54, '%')).toBe('54.0');
	});

	it('rounds other units to whole numbers with grouping', () => {
		expect(formatRecordValue(4210.4, 'MW')).toBe('4,210');
		expect(formatRecordValue(12.7, null)).toBe('13');
	});

	it('returns a dash for missing values', () => {
		expect(formatRecordValue(null, '%')).toBe('—');
		expect(formatRecordValue(undefined, 'MW')).toBe('—');
		expect(formatRecordValue(NaN, 'MW')).toBe('—');
	});
});

describe('recordFractionDigits', () => {
	it('is one for proportions and zero otherwise', () => {
		expect(recordFractionDigits('%')).toBe(1);
		expect(recordFractionDigits('MWh')).toBe(0);
		expect(recordFractionDigits(undefined)).toBe(0);
	});
});
