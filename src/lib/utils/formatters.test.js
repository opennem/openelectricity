import { describe, it, expect } from 'vitest';
import { formatFyTickX } from './formatters.js';

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
