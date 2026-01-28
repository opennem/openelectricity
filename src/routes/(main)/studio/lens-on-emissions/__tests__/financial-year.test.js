import { describe, it, expect } from 'vitest';
import {
	parseQuarter,
	getFinancialYear,
	fyStartDate,
	fyEndDate,
	formatFYRange,
	yearToDate,
	calendarYearToFY
} from '../helpers/financial-year.js';

describe('parseQuarter', () => {
	it('parses Sep-04 to September 2004', () => {
		const date = parseQuarter('Sep-04');
		expect(date.getFullYear()).toBe(2004);
		expect(date.getMonth()).toBe(8); // September is month 8 (0-indexed)
		expect(date.getDate()).toBe(1);
	});

	it('parses Dec-99 to December 1999', () => {
		const date = parseQuarter('Dec-99');
		expect(date.getFullYear()).toBe(1999);
		expect(date.getMonth()).toBe(11); // December
	});

	it('parses Mar-25 to March 2025', () => {
		const date = parseQuarter('Mar-25');
		expect(date.getFullYear()).toBe(2025);
		expect(date.getMonth()).toBe(2); // March
	});

	it('parses Jun-00 to June 2000', () => {
		const date = parseQuarter('Jun-00');
		expect(date.getFullYear()).toBe(2000);
		expect(date.getMonth()).toBe(5); // June
	});

	it('throws for invalid month', () => {
		expect(() => parseQuarter('Jan-04')).toThrow('Invalid quarter month');
	});
});

describe('getFinancialYear', () => {
	it('returns FY 2025 for July 2024', () => {
		const date = new Date(2024, 6, 1); // July 1, 2024
		expect(getFinancialYear(date)).toBe(2025);
	});

	it('returns FY 2025 for June 2025', () => {
		const date = new Date(2025, 5, 30); // June 30, 2025
		expect(getFinancialYear(date)).toBe(2025);
	});

	it('returns FY 2005 for September 2004', () => {
		const date = new Date(2004, 8, 1); // September 1, 2004
		expect(getFinancialYear(date)).toBe(2005);
	});

	it('returns FY 2004 for June 2004', () => {
		const date = new Date(2004, 5, 1); // June 1, 2004
		expect(getFinancialYear(date)).toBe(2004);
	});
});

describe('fyStartDate', () => {
	it('returns July 1, 2004 for FY 2005', () => {
		const date = fyStartDate(2005);
		expect(date.getFullYear()).toBe(2004);
		expect(date.getMonth()).toBe(6); // July
		expect(date.getDate()).toBe(1);
	});
});

describe('fyEndDate', () => {
	it('returns June 30, 2005 for FY 2005', () => {
		const date = fyEndDate(2005);
		expect(date.getFullYear()).toBe(2005);
		expect(date.getMonth()).toBe(5); // June
		expect(date.getDate()).toBe(30);
	});
});

describe('formatFYRange', () => {
	it('formats FY range correctly', () => {
		expect(formatFYRange(1990, 2040)).toBe('FY 1990 — 2040');
	});

	it('formats single year range', () => {
		expect(formatFYRange(2025, 2025)).toBe('FY 2025 — 2025');
	});
});

describe('yearToDate', () => {
	it('converts year to January 1 date', () => {
		const date = yearToDate(2025);
		expect(date.getFullYear()).toBe(2025);
		expect(date.getMonth()).toBe(0); // January
		expect(date.getDate()).toBe(1);
	});
});

describe('calendarYearToFY', () => {
	it('returns same year (projections use calendar year as FY)', () => {
		expect(calendarYearToFY(2025)).toBe(2025);
	});
});
