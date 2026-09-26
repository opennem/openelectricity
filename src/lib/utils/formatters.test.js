import { describe, it, expect } from 'vitest';
import { formatFyTickX, formatCapacity, formatPrice, formatWithUnit } from './formatters.js';

describe('formatPrice', () => {
	it('always shows cents', () => {
		expect(formatPrice(85.3)).toBe('$85.30');
		expect(formatPrice(100)).toBe('$100.00');
		expect(formatPrice(16500)).toBe('$16,500.00');
	});

	it('keeps the sign on negative prices', () => {
		expect(formatPrice(-60.254)).toBe('$-60.25');
	});
});

describe('formatCapacity', () => {
	it('returns a dash for null/undefined', () => {
		expect(formatCapacity(null)).toBe('-');
		expect(formatCapacity(undefined)).toBe('-');
	});

	it('shows up to one decimal below 10', () => {
		expect(formatCapacity(4.2)).toBe('4.2');
		expect(formatCapacity(9.87)).toBe('9.9');
	});

	it('shows whole numbers at or above 10', () => {
		expect(formatCapacity(10)).toBe('10');
		expect(formatCapacity(660.4)).toBe('660');
	});

	it('groups thousands', () => {
		expect(formatCapacity(2800)).toBe('2,800');
	});

	it('formats zero as 0', () => {
		expect(formatCapacity(0)).toBe('0');
	});
});

describe('formatFyTickX', () => {
	it('returns FY25 for Date("2025-01-01")', () => {
		expect(formatFyTickX(new Date('2025-01-01'))).toBe('FY25');
	});

	it('returns FY25 for a timestamp number', () => {
		const ts = new Date('2025-01-01').getTime();
		expect(formatFyTickX(ts)).toBe('FY25');
	});

	it('returns FY10 for Date("2010-01-01")', () => {
		expect(formatFyTickX(new Date('2010-01-01'))).toBe('FY10');
	});

	it('returns FY50 for Date("2050-01-01")', () => {
		expect(formatFyTickX(new Date('2050-01-01'))).toBe('FY50');
	});
});

describe('formatWithUnit', () => {
	it('leads dollar units with $ and folds SI prefixes into a suffix', () => {
		expect(formatWithUnit('85.30', '$/MWh')).toBe('$85.30');
		expect(formatWithUnit('-60.25', '$/MWh')).toBe('$-60.25');
		expect(formatWithUnit('1.2', 'M$')).toBe('$1.2M');
		expect(formatWithUnit('350', 'k$')).toBe('$350k');
		expect(formatWithUnit('1,234', '$')).toBe('$1,234');
	});
	it('keeps $ on dollar values even when the unit is shown elsewhere', () => {
		expect(formatWithUnit('85.30', '$/MWh', { unitShown: true })).toBe('$85.30');
		expect(formatWithUnit('12', 'MW', { unitShown: true })).toBe('12');
	});
	it('passes through values a formatter already prefixed with $', () => {
		expect(formatWithUnit('$1.2M', 'M$')).toBe('$1.2M');
	});
	it('trails other units after the separator and leaves empty values alone', () => {
		expect(formatWithUnit('12', 'MW')).toBe('12 MW');
		expect(formatWithUnit('12', 'MW', { separator: ' ' })).toBe('12 MW');
		expect(formatWithUnit('', '$/MWh')).toBe('');
		expect(formatWithUnit('12', '')).toBe('12');
	});
});
