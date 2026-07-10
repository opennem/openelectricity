import { describe, it, expect } from 'vitest';
import { formatDateRange } from './date-labels.js';

const TZ = 'Australia/Brisbane';

/** Midday network-local on a calendar date, so tz conversion can't move the day. */
function local(/** @type {string} */ date) {
	return new Date(`${date}T12:00:00+10:00`);
}

describe('formatDateRange', () => {
	it('formats a same-month range without a year by default', () => {
		expect(formatDateRange(local('2020-01-21'), local('2020-01-27'), TZ)).toBe('21 — 27 Jan');
	});

	it('formats a cross-month range without a year by default', () => {
		expect(formatDateRange(local('2020-01-28'), local('2020-02-03'), TZ)).toBe('28 Jan — 3 Feb');
	});

	it('always shows both years for a cross-year range', () => {
		expect(formatDateRange(local('2020-12-28'), local('2021-01-03'), TZ)).toBe(
			"28 Dec '20 — 3 Jan '21"
		);
	});

	it('appends the year with alwaysYear', () => {
		// en-AU "short" June is the full word.
		expect(
			formatDateRange(local('2020-06-16'), local('2020-06-22'), TZ, { alwaysYear: true })
		).toBe('16 — 22 June 2020');
	});

	describe('yearIfNotCurrent', () => {
		it('appends the year for a historic same-month range', () => {
			expect(
				formatDateRange(local('2020-01-21'), local('2020-01-27'), TZ, { yearIfNotCurrent: true })
			).toBe('21 — 27 Jan 2020');
		});

		it('appends the year for a historic cross-month range', () => {
			expect(
				formatDateRange(local('2020-01-28'), local('2020-02-03'), TZ, { yearIfNotCurrent: true })
			).toBe('28 Jan — 3 Feb 2020');
		});

		it('omits the year when the range ends in the current year', () => {
			const now = new Date();
			const label = formatDateRange(now, now, TZ, { yearIfNotCurrent: true });
			expect(label).not.toContain(String(now.getFullYear()));
		});
	});
});
