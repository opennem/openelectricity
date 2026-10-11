import { describe, expect, it } from 'vitest';
import { formatLocalDateLabel, latestTimestamp } from './local-date-label.js';

// Run under TZ=UTC, TZ=Australia/Perth and TZ=Australia/Sydney: output must not vary.
describe('formatLocalDateLabel', () => {
	it('uses the local calendar date of NEM midnight', () => {
		expect(formatLocalDateLabel('1979-01-01T00:00:00+10:00')).toBe('1 Jan 1979');
	});

	it('uses the local calendar date of WEM midnight', () => {
		expect(formatLocalDateLabel('2001-10-01T00:00:00+08:00')).toBe('1 Oct 2001');
	});

	it('returns the raw string when unparseable', () => {
		expect(formatLocalDateLabel('invalid')).toBe('invalid');
	});

	it('returns null for empty input', () => {
		expect(formatLocalDateLabel(null)).toBeNull();
		expect(formatLocalDateLabel(undefined)).toBeNull();
	});
});

describe('latestTimestamp', () => {
	it('compares instants across differing offsets', () => {
		// same wall-clock midnight: +08:00 is the later instant
		expect(latestTimestamp(['2020-01-01T00:00:00+10:00', '2020-01-01T00:00:00+08:00'])).toBe(
			'2020-01-01T00:00:00+08:00'
		);
	});

	it('skips empties and prefers parseable values', () => {
		expect(latestTimestamp([null, 'bad', '2020-01-01T00:00:00+10:00'])).toBe(
			'2020-01-01T00:00:00+10:00'
		);
		expect(latestTimestamp([null, undefined])).toBeNull();
		expect(latestTimestamp(['bad'])).toBe('bad');
	});
});
