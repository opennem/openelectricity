import { describe, it, expect } from 'vitest';
import parseInterval from './intervals';
import {
	addYears,
	startOfYear,
	addMonths,
	startOfMonth,
	addMinutes,
	startOfMinute
} from 'date-fns';

describe('intervals.js', () => {
	it('should parse interval string correctly for years', () => {
		const interval = parseInterval('1Y');
		expect(interval.incrementerFn).toBe(addYears);
		expect(interval.startOfFn).toBe(startOfYear);
		expect(interval.seconds).toBe(365 * 24 * 60 * 60);
	});

	it('should parse interval string correctly for months', () => {
		const interval = parseInterval('1M');
		expect(interval.incrementerFn).toBe(addMonths);
		expect(interval.startOfFn).toBe(startOfMonth);
		expect(interval.seconds).toBe(30 * 24 * 60 * 60); // Assuming 30 days in a month for simplicity
	});

	it('should parse interval string correctly for minutes', () => {
		const interval = parseInterval('1m');
		expect(interval.incrementerFn).toBe(addMinutes);
		expect(interval.startOfFn).toBe(startOfMinute);
		expect(interval.seconds).toBe(60);
	});

	it('does not handle hours', () => {
		const interval = parseInterval('1h');
		expect(interval.seconds).toBe(0);
	});

	it('does not handle seconds', () => {
		const interval = parseInterval('1s');
		expect(interval.seconds).toBe(0);
	});

	it('should handle invalid interval strings gracefully', () => {
		const interval = parseInterval('invalid');
		expect(interval.incrementerFn).toBeUndefined();
		expect(interval.startOfFn).toBeUndefined();
		expect(interval.seconds).toBe(0);
	});
});
