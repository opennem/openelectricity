import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOURS_MS, NEM_OFFSET_MS, nemNaiveRange } from './nem-time.js';

describe('nemNaiveRange', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-24T02:30:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('exports the NEM offset (UTC+10, no DST)', () => {
		expect(NEM_OFFSET_MS).toBe(10 * HOURS_MS);
	});

	it('shifts now into naive NEM local time', () => {
		const { dateEnd } = nemNaiveRange(HOURS_MS);
		// 02:30 UTC = 12:30 NEM (UTC+10), timezone suffix dropped
		expect(dateEnd).toBe('2026-07-24T12:30:00');
	});

	it('starts msBack before the end', () => {
		const { dateStart, dateEnd } = nemNaiveRange(3 * HOURS_MS);
		expect(dateStart).toBe('2026-07-24T09:30:00');
		expect(dateEnd).toBe('2026-07-24T12:30:00');
	});

	it('crosses the NEM-local date boundary', () => {
		vi.setSystemTime(new Date('2026-07-24T22:10:00Z'));
		const { dateStart, dateEnd } = nemNaiveRange(HOURS_MS);
		expect(dateStart).toBe('2026-07-25T07:10:00');
		expect(dateEnd).toBe('2026-07-25T08:10:00');
	});

	it('formats both ends as timezone-naive YYYY-MM-DDTHH:mm:ss', () => {
		const naive = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
		const { dateStart, dateEnd } = nemNaiveRange(HOURS_MS);
		expect(dateStart).toMatch(naive);
		expect(dateEnd).toMatch(naive);
	});
});
