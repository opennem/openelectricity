import { afterAll, describe, expect, it } from 'vitest';
import { formatDateBySpecificity, parseCalendarDate } from './date-format.js';

const ORIGINAL_TZ = process.env.TZ;

/**
 * Runtime timezones the labels must not depend on: the server (UTC), each
 * mainland state capital (Adelaide is +9:30/+10:30, Brisbane has no DST) and
 * a viewer west of UTC.
 */
const RUNTIME_TIMEZONES = [
	'UTC',
	'Australia/Sydney',
	'Australia/Brisbane',
	'Australia/Adelaide',
	'Australia/Perth',
	'America/Los_Angeles'
];

/**
 * Switch the process timezone, failing loudly if the runtime ignores it (a
 * silent no-op would make every case below pass vacuously).
 * @param {string} timeZone
 */
function useTimezone(timeZone) {
	process.env.TZ = timeZone;
	expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(timeZone);
}

afterAll(() => {
	if (ORIGINAL_TZ === undefined) delete process.env.TZ;
	else process.env.TZ = ORIGINAL_TZ;
});

describe('parseCalendarDate', () => {
	it('reads the leading calendar date from every source shape', () => {
		for (const value of [
			'2022-01-01', // Sanity
			'2022-01-01T00:00:00', // data-centre sheet
			'2022-01-01T00:00:00+10:00', // OE API, NEM
			'2022-01-01T00:00:00+08:00', // OE API, WEM
			'2022-01-01T00:00:00Z'
		]) {
			expect(parseCalendarDate(value)?.toString()).toBe('2022-01-01');
		}
	});

	it('returns null for missing or invalid dates', () => {
		expect(parseCalendarDate(null)).toBeNull();
		expect(parseCalendarDate(undefined)).toBeNull();
		expect(parseCalendarDate('')).toBeNull();
		expect(parseCalendarDate('not a date')).toBeNull();
		expect(parseCalendarDate('2022-02-30')).toBeNull();
	});
});

describe.each(RUNTIME_TIMEZONES)('formatDateBySpecificity in %s', (timeZone) => {
	it('keeps 1 Jan closures on 1 Jan', () => {
		useTimezone(timeZone);
		// HUNTVGT (NSW) and the data-centre/Sanity shapes of the same date
		expect(formatDateBySpecificity('2022-01-01T00:00:00+10:00', 'day')).toBe('1 Jan 2022');
		expect(formatDateBySpecificity('2022-01-01T00:00:00', 'day')).toBe('1 Jan 2022');
		expect(formatDateBySpecificity('2022-01-01', 'day')).toBe('1 Jan 2022');
	});

	it('formats SA units by their own date', () => {
		useTimezone(timeZone);
		// SA is in the NEM, so the API sends +10:00; Adelaide is +9:30 in winter,
		// where converting through the instant lands on 30 Jun
		expect(formatDateBySpecificity('2022-07-01T00:00:00+10:00', 'day')).toBe('1 July 2022');
		// AMCORGR closure
		expect(formatDateBySpecificity('2015-01-01T00:00:00+10:00', 'year')).toBe('2015');
		// TERMSTOR commencement
		expect(formatDateBySpecificity('2003-10-01T00:00:00+10:00', 'month')).toBe('Oct 2003');
	});

	it('formats QLD units by their own date', () => {
		useTimezone(timeZone);
		// MACKAYGT closure
		expect(formatDateBySpecificity('2021-01-01T00:00:00+10:00', 'year')).toBe('2021');
		// WIVENSH commencement
		expect(formatDateBySpecificity('2002-12-01T00:00:00+10:00', 'month')).toBe('Dec 2002');
		expect(formatDateBySpecificity('2023-01-01T00:00:00+10:00', 'day')).toBe('1 Jan 2023');
	});

	it('formats WEM units by their own date', () => {
		useTimezone(timeZone);
		// KALAMUNDA_SG closure
		expect(formatDateBySpecificity('2022-07-01T00:00:00+08:00', 'day')).toBe('1 July 2022');
		expect(formatDateBySpecificity('2022-01-01T00:00:00+08:00', 'month')).toBe('Jan 2022');
	});
});

describe('formatDateBySpecificity', () => {
	it('formats quarters as the year and defaults to the full date', () => {
		expect(formatDateBySpecificity('2024-04-01', 'quarter')).toBe('2024');
		expect(formatDateBySpecificity('2024-04-01', null)).toBe('1 Apr 2024');
		expect(formatDateBySpecificity('2024-04-01', 'DAY')).toBe('1 Apr 2024');
	});

	it("returns '-' for missing or invalid dates", () => {
		expect(formatDateBySpecificity(null, 'day')).toBe('-');
		expect(formatDateBySpecificity('', 'day')).toBe('-');
		expect(formatDateBySpecificity('soon', 'day')).toBe('-');
	});
});
