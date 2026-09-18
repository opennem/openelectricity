import { DAILY_WINDOW_MS, clampComparisonViewport, utcFormatter } from './region-comparison.js';

/**
 * Moves of the daily one-year window. Every result passes through the daily
 * clamp, so the window never resizes, never passes the last complete day and
 * never starts before the data floor.
 * @typedef {{start: number, end: number}} Viewport
 */

const DAY_MS = 86_400_000;

/** @param {number} end @param {Viewport} bounds - Daily bounds (`comparisonBoundsFor(bounds, '1d')`) */
export function windowEndingAt(end, bounds) {
	return clampComparisonViewport(end - DAILY_WINDOW_MS, end, bounds, '1d');
}
/** @param {number} start @param {Viewport} bounds */
export function windowStartingAt(start, bounds) {
	return clampComparisonViewport(start, start + DAILY_WINDOW_MS, bounds, '1d');
}
/** The window whose first day is the first of `month` (1–12) in `year`.
 * @param {number} year @param {number} month @param {Viewport} bounds */
export function windowStartingAtMonth(year, month, bounds) {
	return windowStartingAt(Date.UTC(year, month - 1, 1), bounds);
}
/** Slide the window by calendar months and days, keeping its first day's
 * day-of-month where the calendar allows.
 * @param {Viewport} viewport @param {Viewport} bounds @param {{months?: number, days?: number}} by */
export function shiftWindow(viewport, bounds, { months = 0, days = 0 }) {
	const date = new Date(viewport.start);
	return windowStartingAt(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate() + days),
		bounds
	);
}
/** Snap the window's first day to the previous (-1) or next (1) 1 January;
 * a window already starting on 1 January steps a whole year.
 * @param {Viewport} viewport @param {Viewport} bounds @param {-1 | 1} direction */
export function snapToYearBoundary(viewport, bounds, direction) {
	const start = new Date(viewport.start);
	const onYearStart = start.getUTCMonth() === 0 && start.getUTCDate() === 1;
	const year = start.getUTCFullYear() + (direction < 0 ? (onYearStart ? -1 : 0) : 1);
	return windowStartingAt(Date.UTC(year, 0, 1), bounds);
}
/**
 * The navigator's keyboard map: arrows move a month, Shift six months,
 * Cmd/Ctrl to a year boundary; Home is the latest window, End the earliest.
 * @param {{key: string, shiftKey?: boolean, metaKey?: boolean, ctrlKey?: boolean}} event
 * @param {Viewport} viewport @param {Viewport} bounds
 * @returns {Viewport | null} - Null when the key is not handled
 */
export function navigationStep(event, viewport, bounds) {
	if (event.key === 'Home') return windowEndingAt(bounds.end, bounds);
	if (event.key === 'End') return windowStartingAt(bounds.start, bounds);
	if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return null;
	const direction = event.key === 'ArrowLeft' ? -1 : 1;
	if (event.metaKey || event.ctrlKey) return snapToYearBoundary(viewport, bounds, direction);
	return shiftWindow(viewport, bounds, { months: direction * (event.shiftKey ? 6 : 1) });
}
/** `16 Jul 2024 – 15 Jul 2025`: the window's first and last complete day.
 * @param {Viewport} viewport */
export function formatDailyWindow(viewport) {
	const day = utcFormatter({ day: 'numeric', month: 'short', year: 'numeric' });
	return `${day.format(viewport.start)} – ${day.format(viewport.end - DAY_MS)}`;
}
export const NAVIGATION_SHORTCUTS =
	'← → one month · Shift six months · Cmd/Ctrl year boundary · Home latest · End earliest';
