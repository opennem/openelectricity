import { describe, expect, it } from 'vitest';
import { getIntervalHours } from './interval-hours.js';

describe('getIntervalHours', () => {
	it('returns 5/60 for 5m', () => {
		expect(getIntervalHours('5m')).toBeCloseTo(5 / 60, 10);
	});

	it('returns 0.5 for 30m', () => {
		expect(getIntervalHours('30m')).toBe(0.5);
	});

	it('returns 1 for 1h', () => {
		expect(getIntervalHours('1h')).toBe(1);
	});

	it('returns 24 for 1d', () => {
		expect(getIntervalHours('1d')).toBe(24);
	});

	it('returns 168 for 7d', () => {
		expect(getIntervalHours('7d')).toBe(7 * 24);
	});

	it('returns 91.25 * 24 for 3M', () => {
		expect(getIntervalHours('3M')).toBe(91.25 * 24);
	});

	it('returns 365.25 * 24 for 1y', () => {
		expect(getIntervalHours('1y')).toBe(365.25 * 24);
	});

	it('falls back to 24 for unknown intervals', () => {
		expect(getIntervalHours('nope')).toBe(24);
		expect(getIntervalHours('')).toBe(24);
	});

	describe('1M (calendar-aware)', () => {
		it('returns 730 when no timestamp is supplied', () => {
			expect(getIntervalHours('1M')).toBe(730);
		});

		it('uses the actual days-in-month for the given timestamp', () => {
			// 31 days
			const jan = new Date(2026, 0, 15).getTime();
			expect(getIntervalHours('1M', jan)).toBe(31 * 24);

			// 28 days (non-leap year)
			const feb2026 = new Date(2026, 1, 15).getTime();
			expect(getIntervalHours('1M', feb2026)).toBe(28 * 24);

			// 29 days (leap year)
			const feb2024 = new Date(2024, 1, 15).getTime();
			expect(getIntervalHours('1M', feb2024)).toBe(29 * 24);

			// 30 days
			const apr = new Date(2026, 3, 15).getTime();
			expect(getIntervalHours('1M', apr)).toBe(30 * 24);
		});
	});

	describe('coarse calendar intervals (network-time, with timestamp)', () => {
		const HOUR = 60 * 60 * 1000;
		const NEM = 'Australia/Brisbane';
		/** Local (AEST) start-of-month UTC ms. */
		const localStart = (/** @type {number} */ y, /** @type {number} */ m0) =>
			Date.UTC(y, m0, 1) - 10 * HOUR;

		it('quarter spans the real quarter length', () => {
			// Q1 2026 (Jan–Mar) = 90 days.
			expect(getIntervalHours('quarter', localStart(2026, 0), NEM)).toBe(90 * 24);
		});

		it('season summer spans Dec–Feb (crosses the year)', () => {
			expect(getIntervalHours('season', localStart(2025, 11), NEM)).toBe(90 * 24);
		});

		it('half-year H1 2026 = 181 days', () => {
			expect(getIntervalHours('half', localStart(2026, 0), NEM)).toBe(181 * 24);
		});

		it('financial year 2025–26 = 365 days', () => {
			expect(getIntervalHours('fy', localStart(2025, 6), NEM)).toBe(365 * 24);
		});

		it('falls back to estimates when no timestamp is given', () => {
			expect(getIntervalHours('season')).toBe(91.25 * 24);
			expect(getIntervalHours('half')).toBe(182.5 * 24);
			expect(getIntervalHours('fy')).toBe(365 * 24);
		});
	});
});
