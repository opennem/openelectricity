import { describe, it, expect } from 'vitest';
import { formatTooltipDateTime, getPowerAxisTicks, formatBucketLabel } from './formatters.js';

const TZ = 'Australia/Brisbane'; // AEST +10, no DST
const OFFSET = '+10:00';
const HOUR = 60 * 60 * 1000;

describe('formatTooltipDateTime', () => {
	// 2026-01-21 04:30 UTC → 14:30 Brisbane
	const date = new Date(Date.UTC(2026, 0, 21, 4, 30));

	it('includes the time for sub-daily (power) intervals', () => {
		for (const di of ['5m', '30m', '1h']) {
			const s = formatTooltipDateTime(date, TZ, di);
			expect(s).toContain('Jan');
			expect(s).toContain('2026');
			expect(s).toContain('21');
			// Brisbane 14:30 → "2:30 pm"
			expect(s).toMatch(/2:30/);
			expect(s.toLowerCase()).toContain('pm');
		}
	});

	it('shows a full date without a time for daily', () => {
		const s = formatTooltipDateTime(date, TZ, '1d');
		expect(s).toContain('21');
		expect(s).toContain('Jan');
		expect(s).toContain('2026');
		expect(s.toLowerCase()).not.toMatch(/am|pm/);
	});

	it('shows month + year for monthly and quarterly', () => {
		for (const di of ['1M', '3M']) {
			const s = formatTooltipDateTime(date, TZ, di);
			expect(s).toContain('Jan');
			expect(s).toContain('2026');
			expect(s).not.toContain('21');
		}
	});

	it('shows only the year for yearly', () => {
		const s = formatTooltipDateTime(date, TZ, '1y');
		expect(s).toContain('2026');
		expect(s).not.toContain('Jan');
	});

	it('returns empty string for invalid input', () => {
		expect(formatTooltipDateTime(new Date('nope'), TZ, '1d')).toBe('');
	});

	it('labels coarse calendar buckets', () => {
		const HOUR = 60 * 60 * 1000;
		const local = (/** @type {number} */ y, /** @type {number} */ m0) =>
			new Date(Date.UTC(y, m0, 1) - 10 * HOUR);
		expect(formatTooltipDateTime(local(2026, 0), TZ, 'quarter')).toBe('Q1 2026');
		expect(formatTooltipDateTime(local(2026, 0), TZ, 'half')).toBe('H1 2026');
		expect(formatTooltipDateTime(local(2026, 6), TZ, 'half')).toBe('H2 2026');
		expect(formatTooltipDateTime(local(2025, 6), TZ, 'fy')).toBe('FY2026'); // Jul 2025 → FY2026
		expect(formatTooltipDateTime(local(2025, 11), TZ, 'season')).toBe('Summer 2025/26');
		expect(formatTooltipDateTime(local(2026, 2), TZ, 'season')).toBe('Autumn 2026');
	});
});

describe('formatBucketLabel', () => {
	const HOUR = 60 * 60 * 1000;
	const local = (/** @type {number} */ y, /** @type {number} */ m0) =>
		new Date(Date.UTC(y, m0, 1) - 10 * HOUR);

	it('names AU seasons (summer crosses the year)', () => {
		expect(formatBucketLabel(local(2025, 11), TZ, 'season')).toBe('Summer 2025/26');
		expect(formatBucketLabel(local(2026, 5), TZ, 'season')).toBe('Winter 2026');
		expect(formatBucketLabel(local(2026, 8), TZ, 'season')).toBe('Spring 2026');
	});

	it('names the financial year by its ending year', () => {
		expect(formatBucketLabel(local(2025, 6), TZ, 'fy')).toBe('FY2026');
	});
});

describe('getPowerAxisTicks', () => {
	it('uses day-start ticks for spans wider than 2 days', () => {
		const data = [{ time: Date.UTC(2026, 0, 21, 2, 0) }, { time: Date.UTC(2026, 0, 22, 2, 0) }];
		const start = Date.UTC(2026, 0, 21, 0, 0);
		const end = start + 5 * 24 * HOUR;
		const { ticks, formatTick } = getPowerAxisTicks(start, end, TZ, OFFSET, data);
		expect(ticks.length).toBe(2);
		// Day-start ticks label as "21 Jan" — no time-of-day.
		expect(formatTick(ticks[0])).toMatch(/Jan/);
		expect(formatTick(ticks[0]).toLowerCase()).not.toMatch(/am|pm/);
	});

	it('emits intra-day time ticks when zoomed in', () => {
		// Brisbane 10:00–16:00 on 21 Jan (6h span).
		const start = Date.UTC(2026, 0, 21, 0, 0); // +10 → 10:00 local
		const end = start + 6 * HOUR;
		const { ticks, formatTick } = getPowerAxisTicks(start, end, TZ, OFFSET, []);
		expect(ticks.length).toBeGreaterThanOrEqual(5);
		// Every tick in this window is a time-of-day label.
		expect(formatTick(ticks[1]).toLowerCase()).toMatch(/am|pm/);
	});

	it('labels local midnight with the date instead of a time', () => {
		// Brisbane 22:00 21 Jan → 04:00 22 Jan (crosses midnight).
		const start = Date.UTC(2026, 0, 21, 12, 0); // +10 → 22:00 local
		const end = start + 6 * HOUR;
		const { ticks, formatTick } = getPowerAxisTicks(start, end, TZ, OFFSET, []);
		const labels = ticks.map((t) => formatTick(t));
		// Exactly one tick falls on local midnight and renders as a date.
		expect(labels.some((l) => /Jan/.test(l))).toBe(true);
		expect(labels.some((l) => /am|pm/i.test(l))).toBe(true);
	});
});
