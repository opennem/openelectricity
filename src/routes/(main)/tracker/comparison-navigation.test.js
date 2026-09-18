import { describe, expect, it } from 'vitest';
import {
	formatDailyWindow,
	navigationStep,
	shiftWindow,
	snapToYearBoundary,
	windowEndingAt,
	windowStartingAt,
	windowStartingAtMonth
} from './comparison-navigation.js';
import { DAILY_WINDOW_MS } from './region-comparison.js';

const DAY = 86_400_000;
const bounds = { start: Date.UTC(1998, 11, 7), end: Date.UTC(2026, 8, 17) };
const window = windowStartingAt(Date.UTC(2024, 6, 16), bounds);

describe('daily window navigation', () => {
	it('keeps a fixed one-year window inside complete history', () => {
		expect(window).toEqual({ start: Date.UTC(2024, 6, 16), end: Date.UTC(2025, 6, 16) });
		expect(windowEndingAt(bounds.end, bounds)).toEqual({
			start: bounds.end - DAILY_WINDOW_MS,
			end: bounds.end
		});
		expect(windowEndingAt(Date.UTC(2030, 0), bounds).end).toBe(bounds.end);
		expect(windowStartingAt(Date.UTC(1990, 0), bounds).start).toBe(bounds.start);
		expect(windowStartingAtMonth(2020, 3, bounds).start).toBe(Date.UTC(2020, 2, 1));
	});
	it('slides by months and snaps to year boundaries', () => {
		expect(shiftWindow(window, bounds, { months: 1 }).start).toBe(Date.UTC(2024, 7, 16));
		expect(shiftWindow(window, bounds, { months: -6 }).start).toBe(Date.UTC(2024, 0, 16));
		expect(snapToYearBoundary(window, bounds, -1).start).toBe(Date.UTC(2024, 0, 1));
		expect(snapToYearBoundary(window, bounds, 1).start).toBe(Date.UTC(2025, 0, 1));
		const january = windowStartingAt(Date.UTC(2024, 0, 1), bounds);
		expect(snapToYearBoundary(january, bounds, -1).start).toBe(Date.UTC(2023, 0, 1));
		expect(snapToYearBoundary(january, bounds, 1).start).toBe(Date.UTC(2025, 0, 1));
	});
	it('maps the keyboard: arrows, Shift, Cmd/Ctrl, Home and End', () => {
		expect(navigationStep({ key: 'ArrowRight' }, window, bounds)?.start).toBe(
			Date.UTC(2024, 7, 16)
		);
		expect(navigationStep({ key: 'ArrowLeft', shiftKey: true }, window, bounds)?.start).toBe(
			Date.UTC(2024, 0, 16)
		);
		expect(navigationStep({ key: 'ArrowLeft', metaKey: true }, window, bounds)?.start).toBe(
			Date.UTC(2024, 0, 1)
		);
		expect(navigationStep({ key: 'ArrowRight', ctrlKey: true }, window, bounds)?.start).toBe(
			Date.UTC(2025, 0, 1)
		);
		expect(navigationStep({ key: 'Home' }, window, bounds)?.end).toBe(bounds.end);
		expect(navigationStep({ key: 'End' }, window, bounds)?.start).toBe(bounds.start);
		expect(navigationStep({ key: 'PageUp' }, window, bounds)).toBeNull();
	});
	it('reads the window as its first and last complete day', () => {
		expect(formatDailyWindow(window)).toBe('16 July 2024 – 15 July 2025');
		expect(formatDailyWindow({ start: 0, end: DAY })).toBe('1 Jan 1970 – 1 Jan 1970');
	});
});
