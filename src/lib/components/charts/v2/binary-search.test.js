import { describe, it, expect } from 'vitest';
import { bisectTime, bisectTimeRight, indexOfTime, mergeSortedByTime } from './binary-search.js';

const rows = (/** @type {number[]} */ times, /** @type {string} */ tag = '') =>
	times.map((time) => ({ time, tag }));

describe('bisectTime', () => {
	const data = rows([10, 20, 30, 40, 50]);

	it('returns the index of the first row at or after t', () => {
		expect(bisectTime(data, 30)).toBe(2);
		expect(bisectTime(data, 25)).toBe(2);
		expect(bisectTime(data, 10)).toBe(0);
	});

	it('returns 0 when t precedes all rows', () => {
		expect(bisectTime(data, 5)).toBe(0);
	});

	it('returns length when t is after all rows', () => {
		expect(bisectTime(data, 55)).toBe(5);
	});

	it('handles empty arrays', () => {
		expect(bisectTime([], 10)).toBe(0);
	});
});

describe('bisectTimeRight', () => {
	const data = rows([10, 20, 30, 40, 50]);

	it('returns the index after an exact match (inclusive-end slicing)', () => {
		expect(bisectTimeRight(data, 30)).toBe(3);
		expect(data.slice(bisectTime(data, 20), bisectTimeRight(data, 40)).length).toBe(3);
	});

	it('matches bisectTime for values between rows', () => {
		expect(bisectTimeRight(data, 25)).toBe(bisectTime(data, 25));
	});
});

describe('indexOfTime', () => {
	const data = rows([10, 20, 30]);

	it('returns the exact index on a hit', () => {
		expect(indexOfTime(data, 20)).toBe(1);
	});

	it('returns -1 on a miss', () => {
		expect(indexOfTime(data, 25)).toBe(-1);
		expect(indexOfTime(data, 5)).toBe(-1);
		expect(indexOfTime(data, 35)).toBe(-1);
		expect(indexOfTime([], 10)).toBe(-1);
	});
});

describe('mergeSortedByTime', () => {
	it('appends when incoming is entirely later', () => {
		const merged = mergeSortedByTime(rows([1, 2, 3]), rows([4, 5]));
		expect(merged.map((r) => r.time)).toEqual([1, 2, 3, 4, 5]);
	});

	it('prepends when incoming is entirely earlier', () => {
		const merged = mergeSortedByTime(rows([4, 5]), rows([1, 2, 3]));
		expect(merged.map((r) => r.time)).toEqual([1, 2, 3, 4, 5]);
	});

	it('interleaves overlapping ranges', () => {
		const merged = mergeSortedByTime(rows([1, 3, 5]), rows([2, 4, 6]));
		expect(merged.map((r) => r.time)).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('dedupes equal timestamps with incoming winning', () => {
		const merged = mergeSortedByTime(rows([1, 2, 3], 'old'), rows([2, 3, 4], 'new'));
		expect(merged.map((r) => r.time)).toEqual([1, 2, 3, 4]);
		expect(merged.map((r) => /** @type {any} */ (r).tag)).toEqual(['old', 'new', 'new', 'new']);
	});

	it('handles empty inputs', () => {
		expect(mergeSortedByTime([], rows([1, 2]))).toHaveLength(2);
		expect(mergeSortedByTime(rows([1, 2]), [])).toHaveLength(2);
		expect(mergeSortedByTime([], [])).toEqual([]);
	});
});
