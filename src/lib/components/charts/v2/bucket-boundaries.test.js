import { describe, it, expect } from 'vitest';
import {
	startYearMonth,
	bucketStartMs,
	bucketSpanHours,
	bucketStartsInRange,
	isCalendarBucketKind
} from './bucket-boundaries.js';

const NEM = 10; // AEST offset hours
const WEM = 8; // AWST offset hours
const HOUR = 60 * 60 * 1000;

/**
 * Build a UTC ms for a local (network) wall-clock date.
 * @param {number} year @param {number} month0 @param {number} day @param {number} offsetHours
 */
function localMs(year, month0, day, offsetHours) {
	return Date.UTC(year, month0, day) - offsetHours * HOUR;
}

describe('startYearMonth', () => {
	it('quarter snaps to Jan/Apr/Jul/Oct', () => {
		expect(startYearMonth('quarter', 2026, 0)).toEqual({ year: 2026, month0: 0 });
		expect(startYearMonth('quarter', 2026, 4)).toEqual({ year: 2026, month0: 3 });
		expect(startYearMonth('quarter', 2026, 8)).toEqual({ year: 2026, month0: 6 });
		expect(startYearMonth('quarter', 2026, 11)).toEqual({ year: 2026, month0: 9 });
	});

	it('half-year snaps to Jan or Jul', () => {
		expect(startYearMonth('half', 2026, 5)).toEqual({ year: 2026, month0: 0 });
		expect(startYearMonth('half', 2026, 6)).toEqual({ year: 2026, month0: 6 });
	});

	it('financial year starts in July; Jan–Jun belong to the prior July', () => {
		expect(startYearMonth('fy', 2026, 6)).toEqual({ year: 2026, month0: 6 }); // Jul 2026
		expect(startYearMonth('fy', 2026, 11)).toEqual({ year: 2026, month0: 6 }); // Dec 2026
		expect(startYearMonth('fy', 2026, 0)).toEqual({ year: 2025, month0: 6 }); // Jan 2026 → FY started Jul 2025
		expect(startYearMonth('fy', 2026, 5)).toEqual({ year: 2025, month0: 6 }); // Jun 2026
	});

	it('AU seasons; Jan/Feb roll into the prior December summer', () => {
		expect(startYearMonth('season', 2026, 11)).toEqual({ year: 2026, month0: 11 }); // Dec → summer
		expect(startYearMonth('season', 2026, 0)).toEqual({ year: 2025, month0: 11 }); // Jan → prior Dec
		expect(startYearMonth('season', 2026, 1)).toEqual({ year: 2025, month0: 11 }); // Feb → prior Dec
		expect(startYearMonth('season', 2026, 2)).toEqual({ year: 2026, month0: 2 }); // Mar → autumn
		expect(startYearMonth('season', 2026, 6)).toEqual({ year: 2026, month0: 5 }); // Jul → winter
		expect(startYearMonth('season', 2026, 9)).toEqual({ year: 2026, month0: 8 }); // Oct → spring
	});

	it('year snaps to January', () => {
		expect(startYearMonth('1y', 2026, 7)).toEqual({ year: 2026, month0: 0 });
	});
});

describe('bucketStartMs (network time)', () => {
	it('buckets a late-June NEM point into the current FY (no UTC leak)', () => {
		// 30 Jun 2026 23:55 AEST → should stay in FY that started Jul 2025.
		const t = localMs(2026, 5, 30, NEM) + 23 * HOUR + 55 * 60 * 1000;
		expect(bucketStartMs('fy', t, NEM)).toBe(localMs(2025, 6, 1, NEM));
	});

	it('buckets 1 Jul 00:00 AEST into the new FY', () => {
		const t = localMs(2026, 6, 1, NEM);
		expect(bucketStartMs('fy', t, NEM)).toBe(localMs(2026, 6, 1, NEM));
	});

	it('buckets a January point into the prior December summer (network time)', () => {
		const t = localMs(2026, 0, 15, NEM);
		expect(bucketStartMs('season', t, NEM)).toBe(localMs(2025, 11, 1, NEM));
	});

	it('uses the WEM offset when given', () => {
		const t = localMs(2026, 2, 10, WEM); // Mar → autumn
		expect(bucketStartMs('season', t, WEM)).toBe(localMs(2026, 2, 1, WEM));
	});
});

describe('bucketSpanHours', () => {
	it('season spans the real calendar length (summer crosses a year)', () => {
		// Summer 2025: Dec 2025 + Jan + Feb 2026 = 31+31+28 = 90 days.
		const t = localMs(2025, 11, 1, NEM);
		expect(bucketSpanHours('season', t, NEM)).toBe(90 * 24);
	});

	it('half-year H1 (Jan–Jun 2026) = 181 days', () => {
		const t = localMs(2026, 0, 1, NEM);
		expect(bucketSpanHours('half', t, NEM)).toBe(181 * 24);
	});

	it('financial year 2025–26 = 365 days', () => {
		const t = localMs(2025, 6, 1, NEM);
		expect(bucketSpanHours('fy', t, NEM)).toBe(365 * 24);
	});

	it('quarter Q1 2026 (Jan–Mar) = 90 days', () => {
		const t = localMs(2026, 0, 1, NEM);
		expect(bucketSpanHours('quarter', t, NEM)).toBe(90 * 24);
	});
});

describe('bucketStartsInRange', () => {
	it('walks month starts across a year boundary at +10', () => {
		// 15 Nov 2025 → 20 Feb 2026 local: buckets Nov, Dec, Jan, Feb.
		const from = localMs(2025, 10, 15, NEM);
		const to = localMs(2026, 1, 20, NEM);
		expect(bucketStartsInRange('1M', from, to, NEM)).toEqual([
			localMs(2025, 10, 1, NEM),
			localMs(2025, 11, 1, NEM),
			localMs(2026, 0, 1, NEM),
			localMs(2026, 1, 1, NEM)
		]);
	});

	it('starts at the bucket containing the range start (may precede it)', () => {
		const from = localMs(2026, 4, 20, NEM); // 20 May → Q2 (Apr) bucket
		const to = localMs(2026, 7, 10, NEM);
		expect(bucketStartsInRange('quarter', from, to, NEM)).toEqual([
			localMs(2026, 3, 1, NEM),
			localMs(2026, 6, 1, NEM)
		]);
	});

	it('walks financial years from their July starts', () => {
		const from = localMs(2025, 8, 1, NEM); // Sep 2025 → FY2026 (Jul 2025)
		const to = localMs(2026, 7, 1, NEM); // Aug 2026 → FY2027 (Jul 2026)
		expect(bucketStartsInRange('fy', from, to, NEM)).toEqual([
			localMs(2025, 6, 1, NEM),
			localMs(2026, 6, 1, NEM)
		]);
	});

	it('returns a single bucket for a range inside one bucket', () => {
		const from = localMs(2026, 0, 5, NEM);
		const to = localMs(2026, 0, 20, NEM);
		expect(bucketStartsInRange('1y', from, to, NEM)).toEqual([localMs(2026, 0, 1, NEM)]);
	});
});

describe('isCalendarBucketKind', () => {
	it('accepts the calendar kinds and rejects fixed/unknown grains', () => {
		for (const kind of ['1M', '3M', 'quarter', 'season', 'half', 'fy', '1y']) {
			expect(isCalendarBucketKind(kind)).toBe(true);
		}
		for (const kind of ['1d', '7d', '5m', '30m', '1h', 'bogus']) {
			expect(isCalendarBucketKind(kind)).toBe(false);
		}
	});
});
