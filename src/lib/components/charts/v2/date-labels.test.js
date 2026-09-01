import { describe, it, expect } from 'vitest';
import { appendHistoricalYear, formatDateRange, formatDayMonth } from './date-labels.js';

const TZ = 'Australia/Brisbane';

/** Midday network-local on a calendar date, so tz conversion can't move the day. */
function local(/** @type {string} */ date) {
	return new Date(`${date}T12:00:00+10:00`);
}

describe('conditional axis years', () => {
	it('keeps current-year day/month labels compact', () => {
		expect(formatDayMonth(local('2026-01-21'), TZ, local('2026-09-01'))).toBe('21 Jan');
	});

	it('adds the full year to historical day/month labels', () => {
		expect(formatDayMonth(local('2025-01-21'), TZ, local('2026-09-01'))).toBe('21 Jan 2025');
	});

	it('adds the full year to historical custom time labels', () => {
		expect(appendHistoricalYear(local('2025-01-21'), '2:00 pm', TZ, local('2026-09-01'))).toBe(
			'2:00 pm 2025'
		);
		expect(appendHistoricalYear(local('2026-01-21'), '2:00 pm', TZ, local('2026-09-01'))).toBe(
			'2:00 pm'
		);
	});

	it('compares calendar years in the chart timezone at New Year', () => {
		// Both instants are already 2026 in Brisbane even though their UTC
		// calendar year is still 2025.
		const tick = new Date('2025-12-31T14:00:00Z');
		const reference = new Date('2025-12-31T14:30:00Z');
		expect(formatDayMonth(tick, TZ, reference)).toBe('1 Jan');
	});
});

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
				formatDateRange(local('2020-01-21'), local('2020-01-27'), TZ, {
					yearIfNotCurrent: true,
					referenceDate: local('2021-01-01')
				})
			).toBe('21 — 27 Jan 2020');
		});

		it('appends the year for a historic cross-month range', () => {
			expect(
				formatDateRange(local('2020-01-28'), local('2020-02-03'), TZ, {
					yearIfNotCurrent: true,
					referenceDate: local('2021-01-01')
				})
			).toBe('28 Jan — 3 Feb 2020');
		});

		it('omits the year when the range ends in the current year', () => {
			const label = formatDateRange(local('2026-01-21'), local('2026-01-27'), TZ, {
				yearIfNotCurrent: true,
				referenceDate: local('2026-09-01')
			});
			expect(label).toBe('21 — 27 Jan');
		});
	});
});
