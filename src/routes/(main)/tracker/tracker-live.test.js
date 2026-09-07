import { afterEach, describe, expect, it, vi } from 'vitest';
import { latestReading, readingStatus, startTrackerLive } from './tracker-live.js';

afterEach(() => vi.useRealTimers());

describe('Tracker live clock', () => {
	it('ticks once a minute in the foreground, catches up once, and disposes', () => {
		vi.useFakeTimers();
		const document = Object.assign(new EventTarget(), { hidden: false });
		const tick = vi.fn();
		const stop = startTrackerLive({ document, tick });
		expect(tick).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(60_000);
		expect(tick).toHaveBeenCalledTimes(2);
		document.hidden = true;
		document.dispatchEvent(new Event('visibilitychange'));
		vi.advanceTimersByTime(600_000);
		expect(tick).toHaveBeenCalledTimes(2);
		document.hidden = false;
		document.dispatchEvent(new Event('visibilitychange'));
		expect(tick).toHaveBeenCalledTimes(3);
		stop();
		vi.advanceTimersByTime(600_000);
		document.dispatchEvent(new Event('visibilitychange'));
		expect(tick).toHaveBeenCalledTimes(3);
	});
	it('does not start hidden', () => {
		vi.useFakeTimers();
		const document = Object.assign(new EventTarget(), { hidden: true });
		const tick = vi.fn();
		const stop = startTrackerLive({ document, tick });
		vi.advanceTimersByTime(60_000);
		expect(tick).not.toHaveBeenCalled();
		stop();
	});
});

describe('reading freshness', () => {
	it('uses calendar cadence for coarse data and flags genuinely old monthly buckets', () => {
		const latest = Date.parse('2026-08-01T00:00:00+10:00');
		const input = {
			latest,
			now: latest + 15 * 86_400_000,
			interval: '1M',
			following: true,
			pending: false,
			error: null
		};
		expect(readingStatus(input)).toBe('Latest bucket');
		expect(readingStatus({ ...input, now: latest + 100 * 86_400_000 })).toBe('Data delayed');
	});
	it('rejects missing, non-finite, synthetic and out-of-window readings, retaining zero', () => {
		const snapshot = {
			start: 10,
			end: 100,
			seriesNames: ['wind'],
			nativeData: [
				{ time: 5, wind: 1 },
				{ time: 20, wind: 0 },
				{ time: 30, wind: null },
				{ time: 40, wind: NaN },
				{ time: 50, wind: 10, _bandClose: true },
				{ time: 101, wind: 10 }
			]
		};
		expect(latestReading(/** @type {any} */ (snapshot))).toBe(20);
		expect(latestReading(null)).toBeNull();
	});
	it('keeps errors, pending and empty distinct and never labels historical data delayed', () => {
		const input = {
			latest: 1_000,
			now: 1_000_000,
			interval: '5m',
			following: true,
			pending: false,
			error: null
		};
		expect(readingStatus(input)).toBe('Data delayed');
		expect(readingStatus({ ...input, now: 100_000 })).toBe('Latest interval');
		expect(readingStatus({ ...input, following: false })).toBe('Latest in view');
		expect(readingStatus({ ...input, filtered: true })).toBe('Latest in view');
		expect(readingStatus({ ...input, pending: true })).toBe('Updating…');
		expect(readingStatus({ ...input, error: 'Failure' })).toBe('Update unavailable');
		expect(readingStatus({ ...input, latest: null })).toBe('No readings');
		expect(readingStatus({ ...input, interval: '1M' })).toBe('Latest bucket');
	});
});
