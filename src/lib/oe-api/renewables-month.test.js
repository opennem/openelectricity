import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	lastCompleteMonthIso,
	monthsBetween,
	trimStatsDataToLastDate,
	findLatestLastDate
} from './renewables-month.js';

describe('lastCompleteMonthIso', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	/**
	 * @param {string} instant absolute instant to freeze the clock at
	 * @param {string} expectedMonth expected `YYYY-MM` prefix of the result
	 */
	const at = (instant, expectedMonth) => {
		vi.setSystemTime(new Date(instant));
		expect(lastCompleteMonthIso()).toBe(`${expectedMonth}-01T00:00:00+10:00`);
	};

	it('returns the previous month for the reported bug window (09:56 AEST, 1 Jul)', () => {
		// 2026-07-01T09:56 AEST is still 2026-06-30T23:56Z — UTC would wrongly read June
		at('2026-06-30T23:56:00Z', '2026-06');
	});

	it('returns the previous month at the very start of an AEST month', () => {
		// 2026-07-01T00:00 AEST == 2026-06-30T14:00Z
		at('2026-06-30T14:00:00Z', '2026-06');
	});

	it('returns the previous month mid-month', () => {
		at('2026-07-15T02:00:00Z', '2026-06');
	});

	it('does not advance until the AEST month actually rolls over', () => {
		// 2026-07-31T23:00 AEST (July not yet complete) == 2026-07-31T13:00Z
		at('2026-07-31T13:00:00Z', '2026-06');
		// 2026-08-01T00:30 AEST (July now complete) == 2026-07-31T14:30Z
		at('2026-07-31T14:30:00Z', '2026-07');
	});

	it('rolls back across the year boundary in January (AEST)', () => {
		// 2026-01-01T05:00 AEST == 2025-12-31T19:00Z
		at('2025-12-31T19:00:00Z', '2025-12');
	});
});

describe('monthsBetween', () => {
	it('counts whole months between ISO month timestamps', () => {
		expect(monthsBetween('2026-05-01T00:00:00+10:00', '2026-06-01T00:00:00+10:00')).toBe(1);
		expect(monthsBetween('2025-06-01T00:00:00+10:00', '2026-06-01T00:00:00+10:00')).toBe(12);
		expect(monthsBetween('2026-06-01T00:00:00+10:00', '2026-06-01T00:00:00+10:00')).toBe(0);
	});
});

describe('trimStatsDataToLastDate', () => {
	/** @param {string} last @param {number[]} data */
	const stat = (last, data) => /** @type {any} */ ({ id: 'x', history: { last, data } });
	/** @param {string} last @param {number[]} data @param {string} target */
	const trimOne = (last, data, target) => trimStatsDataToLastDate([stat(last, data)], target)[0];

	it('drops trailing months past the target and rewrites history.last', () => {
		// data ends July; trim to June => drop 1 trailing point
		const out = trimOne('2026-07-01T00:00:00+10:00', [1, 2, 3, 4], '2026-06-01T00:00:00+10:00');
		expect(out.history.last).toBe('2026-06-01T00:00:00+10:00');
		expect(out.history.data).toEqual([1, 2, 3]);
	});

	it('leaves records that already end on or before the target untouched', () => {
		const out = trimOne('2026-05-01T00:00:00+10:00', [1, 2], '2026-06-01T00:00:00+10:00');
		expect(out.history.data).toEqual([1, 2]);
		expect(out.history.last).toBe('2026-05-01T00:00:00+10:00');
	});
});

describe('findLatestLastDate', () => {
	it('returns the max history.last, or null when empty', () => {
		expect(
			findLatestLastDate(
				/** @type {any[]} */ ([
					{ history: { last: '2026-04-01T00:00:00+10:00' } },
					{ history: { last: '2026-06-01T00:00:00+10:00' } },
					{ history: { last: '2026-05-01T00:00:00+10:00' } }
				])
			)
		).toBe('2026-06-01T00:00:00+10:00');
		expect(findLatestLastDate([])).toBe(null);
	});
});
