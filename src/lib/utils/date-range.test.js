import { describe, expect, it } from 'vitest';
import { isHistoricalWindow } from './date-range.js';

describe('isHistoricalWindow', () => {
	const nowMs = new Date('2026-08-27T12:00:00+10:00').getTime();

	it('accepts network-local dates and datetimes', () => {
		expect(isHistoricalWindow('2026-08-25', nowMs)).toBe(true);
		expect(isHistoricalWindow('2026-08-25T12:00:00', nowMs)).toBe(true);
	});

	it('keeps recent, missing, and invalid windows live', () => {
		expect(isHistoricalWindow('2026-08-27T00:00:01', nowMs)).toBe(false);
		expect(isHistoricalWindow(undefined, nowMs)).toBe(false);
		expect(isHistoricalWindow('invalid', nowMs)).toBe(false);
	});
});
