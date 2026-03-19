import { describe, it, expect } from 'vitest';
import { formatFyTickX } from './formatters.js';

describe('formatFyTickX', () => {
	it('returns FY24/25 for Date("2025-01-01")', () => {
		expect(formatFyTickX(new Date('2025-01-01'))).toBe('FY24/25');
	});

	it('returns FY24/25 for a timestamp number', () => {
		const ts = new Date('2025-01-01').getTime();
		expect(formatFyTickX(ts)).toBe('FY24/25');
	});

	it('returns FY09/10 for Date("2010-01-01")', () => {
		expect(formatFyTickX(new Date('2010-01-01'))).toBe('FY09/10');
	});

	it('returns FY49/50 for Date("2050-01-01")', () => {
		expect(formatFyTickX(new Date('2050-01-01'))).toBe('FY49/50');
	});
});
