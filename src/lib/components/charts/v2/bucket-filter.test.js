import { describe, it, expect } from 'vitest';
import {
	applyBucketFilter,
	applyBucketFilterToDisplayRows,
	bucketFilterKindFor,
	bucketFilterOptionsFor,
	bucketFilterPredicate,
	isValidBucketFilter
} from './bucket-filter.js';

const TZ = 'Australia/Brisbane';
const NEM = 10;

/** Network-local month start. @param {number} y @param {number} m0 */
const monthStart = (y, m0) => Date.UTC(y, m0, 1, -NEM);

describe('bucketFilterKindFor', () => {
	it('maps display intervals (incl. rolling variants) to their filter kind', () => {
		expect(bucketFilterKindFor('1M')).toBe('1M');
		expect(bucketFilterKindFor('12mr')).toBe('1M');
		expect(bucketFilterKindFor('season')).toBe('season');
		expect(bucketFilterKindFor('12mr-season')).toBe('season');
		expect(bucketFilterKindFor('quarter')).toBe('quarter');
		expect(bucketFilterKindFor('12mr-half')).toBe('half');
		expect(bucketFilterKindFor('fy')).toBeNull();
		expect(bucketFilterKindFor('1y')).toBeNull();
		expect(bucketFilterKindFor('1d')).toBeNull();
	});
});

describe('bucket filter options and validation', () => {
	it('offers the calendar periods per kind', () => {
		expect(bucketFilterOptionsFor('1M')?.map((o) => o.id)).toHaveLength(12);
		expect(bucketFilterOptionsFor('season')?.map((o) => o.id)).toEqual([
			'summer',
			'autumn',
			'winter',
			'spring'
		]);
		expect(bucketFilterOptionsFor('quarter')?.map((o) => o.id)).toEqual(['q1', 'q2', 'q3', 'q4']);
		expect(bucketFilterOptionsFor('half')?.map((o) => o.id)).toEqual(['h1', 'h2']);
		expect(bucketFilterOptionsFor(null)).toBeNull();
	});

	it('validates ids against their kind', () => {
		expect(isValidBucketFilter('1M', 'jan')).toBe(true);
		expect(isValidBucketFilter('1M', 'summer')).toBe(false);
		expect(isValidBucketFilter('season', 'summer')).toBe(true);
		expect(isValidBucketFilter(null, 'jan')).toBe(false);
		expect(isValidBucketFilter('1M', null)).toBe(false);
	});
});

describe('bucketFilterPredicate', () => {
	it('matches months', () => {
		const jan = bucketFilterPredicate('1M', 'jan', TZ);
		expect(jan?.(monthStart(2025, 0))).toBe(true);
		expect(jan?.(monthStart(2025, 1))).toBe(false);
	});

	it('matches seasons for bucket starts AND their monthly members', () => {
		const summer = bucketFilterPredicate('season', 'summer', TZ);
		// Summer bucket starts in December…
		expect(summer?.(monthStart(2024, 11))).toBe(true);
		// …and January/February belong to it; March starts autumn.
		expect(summer?.(monthStart(2025, 0))).toBe(true);
		expect(summer?.(monthStart(2025, 1))).toBe(true);
		expect(summer?.(monthStart(2025, 2))).toBe(false);
	});

	it('matches quarters and halves', () => {
		const q4 = bucketFilterPredicate('quarter', 'q4', TZ);
		expect(q4?.(monthStart(2025, 9))).toBe(true);
		expect(q4?.(monthStart(2025, 11))).toBe(true);
		expect(q4?.(monthStart(2025, 8))).toBe(false);
		const h2 = bucketFilterPredicate('half', 'h2', TZ);
		expect(h2?.(monthStart(2025, 6))).toBe(true);
		expect(h2?.(monthStart(2025, 5))).toBe(false);
	});

	it('returns null for invalid combinations', () => {
		expect(bucketFilterPredicate('1M', null, TZ)).toBeNull();
		expect(bucketFilterPredicate('1M', 'summer', TZ)).toBeNull();
		expect(bucketFilterPredicate(null, 'jan', TZ)).toBeNull();
	});
});

describe('applyBucketFilter', () => {
	it('nulls non-matching rows but keeps their date/time', () => {
		const rows = [0, 1, 2].map((m0) => {
			const time = monthStart(2025, m0);
			return { time, date: new Date(time), a: m0 + 1 };
		});
		const out = applyBucketFilter(rows, bucketFilterPredicate('1M', 'feb', TZ));
		expect(out).toHaveLength(3);
		expect(out[0].a).toBeUndefined();
		expect(out[1].a).toBe(2);
		expect(out[2].a).toBeUndefined();
		expect(out.map((r) => r.time)).toEqual(rows.map((r) => r.time));
	});

	it('is a no-op without a predicate', () => {
		const rows = [{ time: 0, date: new Date(0), a: 1 }];
		expect(applyBucketFilter(rows, null)).toBe(rows);
	});
});

describe('applyBucketFilterToDisplayRows', () => {
	// Two years of monthly rows, plus January 2026.
	const rows = Array.from({ length: 25 }, (_, i) => {
		const time = monthStart(2024, i);
		return { time, date: new Date(time), a: i + 1 };
	});

	it('drops non-matching rows so occurrences connect', () => {
		const out = applyBucketFilterToDisplayRows(rows, bucketFilterPredicate('1M', 'jan', TZ), TZ);
		// Three Januaries plus the final band's closing row.
		expect(out).toHaveLength(4);
		expect(out.map((row) => row.a)).toEqual([1, 13, 25, 25]);
		expect(out[0].time).toBe(monthStart(2024, 0));
		expect(out[1].time).toBe(monthStart(2025, 0));
	});

	it('closes the final band one occurrence-spacing later', () => {
		const out = applyBucketFilterToDisplayRows(rows, bucketFilterPredicate('1M', 'jan', TZ), TZ);
		const terminator = out[out.length - 1];
		expect(terminator._bandClose).toBe(true);
		expect(terminator.time).toBe(monthStart(2027, 0) - 1);
	});

	it('closes a lone occurrence at the next calendar year', () => {
		const out = applyBucketFilterToDisplayRows(
			rows.slice(0, 6),
			bucketFilterPredicate('1M', 'feb', TZ),
			TZ
		);
		expect(out).toHaveLength(2);
		expect(out[0].a).toBe(2);
		expect(out[1]).toMatchObject({ a: 2, _bandClose: true });
		expect(out[1].time).toBe(monthStart(2025, 1) - 1);
	});

	it('closes leap-year buckets at the next network-local month start', () => {
		const march2024 = [
			{
				time: monthStart(2024, 2),
				date: new Date(monthStart(2024, 2)),
				a: 1
			}
		];
		const out = applyBucketFilterToDisplayRows(
			march2024,
			bucketFilterPredicate('1M', 'mar', TZ),
			TZ
		);
		expect(out[1].time).toBe(monthStart(2025, 2) - 1);
	});
});
