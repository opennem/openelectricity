import { describe, it, expect } from 'vitest';
import { computeEnergyGridlines } from './energy-gridlines.js';

const TZ = 'Australia/Brisbane'; // AEST +10, no DST
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const localMidnight = (
	/** @type {number} */ y,
	/** @type {number} */ m0,
	/** @type {number} */ d
) => Date.UTC(y, m0, d) - 10 * HOUR;
const localMonthStart = (/** @type {number} */ y, /** @type {number} */ m0) =>
	Date.UTC(y, m0, 1) - 10 * HOUR;

/** @param {number[]} times */
const rows = (times) => times.map((time) => ({ time }));

/** @param {ReturnType<typeof computeEnergyGridlines>} g */
const labels = (g) => g.ticks.map((t) => g.formatTick(t));

describe('computeEnergyGridlines — daily data', () => {
	it('labels each day when there are few points', () => {
		const times = Array.from({ length: 7 }, (_, i) => localMidnight(2025, 5, 16) + i * DAY);
		const g = computeEnergyGridlines(rows(times), times[0], times[6] + DAY, TZ);

		expect(g.gridlineTicks.length).toBe(7);
		expect(g.ticks.length).toBe(7);
		expect(labels(g)).toEqual([
			'16 June',
			'17 June',
			'18 June',
			'19 June',
			'20 June',
			'21 June',
			'22 June'
		]);
	});

	it('groups into week bands with inclusive day ranges at ~1 month', () => {
		const times = Array.from({ length: 30 }, (_, i) => localMidnight(2025, 5, 1) + i * DAY);
		const g = computeEnergyGridlines(rows(times), times[0], times[29] + DAY, TZ);

		expect(labels(g)).toEqual([
			'1 — 7 June',
			'8 — 14 June',
			'15 — 21 June',
			'22 — 28 June',
			'29 June — 5 July'
		]);
	});

	it('labels arbitrary (non-midpoint) dates with a day-start fallback', () => {
		const times = Array.from({ length: 30 }, (_, i) => localMidnight(2025, 5, 1) + i * DAY);
		const g = computeEnergyGridlines(rows(times), times[0], times[29] + DAY, TZ);

		expect(g.formatTick(new Date(localMidnight(2025, 5, 4)))).toBe('4 June');
	});
});

describe('computeEnergyGridlines — yearly gridlines (3y+ viewports)', () => {
	it('snaps to January starts and labels the year', () => {
		const times = Array.from({ length: 36 }, (_, i) => localMonthStart(2022, i));
		const g = computeEnergyGridlines(rows(times), times[0], localMonthStart(2025, 0), TZ);

		expect(g.gridlineTicks.length).toBe(3);
		expect(labels(g)).toEqual(['2022', '2023', '2024']);
	});
});

describe('computeEnergyGridlines — monthly data', () => {
	it('labels each month once, with the year on January', () => {
		const times = Array.from({ length: 12 }, (_, i) => localMonthStart(2025, i));
		const g = computeEnergyGridlines(rows(times), times[0], localMonthStart(2026, 0), TZ);

		// A 31-day band-width estimate must not push single-month bands into
		// the prior month ("Feb — Jan '25").
		expect(labels(g)).toEqual([
			"Jan '25",
			'Feb',
			'Mar',
			'Apr',
			'May',
			'June',
			'July',
			'Aug',
			'Sept',
			'Oct',
			'Nov',
			'Dec'
		]);
	});
});

describe('computeEnergyGridlines — weekly data', () => {
	it('labels single-week bands as inclusive week ranges', () => {
		const times = Array.from({ length: 6 }, (_, i) => localMidnight(2025, 5, 16) + i * 7 * DAY);
		const g = computeEnergyGridlines(rows(times), times[0], times[5] + 7 * DAY, TZ);

		expect(g.gridlineTicks.length).toBe(6);
		expect(labels(g)).toEqual([
			'16 — 22 June',
			'23 — 29 June',
			'30 June — 6 July',
			'7 — 13 July',
			'14 — 20 July',
			'21 — 27 July'
		]);
	});

	it('thins a year of weeks into 4-week bands ending on the true last day', () => {
		const times = Array.from({ length: 52 }, (_, i) => localMidnight(2024, 6, 1) + i * 7 * DAY);
		const g = computeEnergyGridlines(rows(times), times[0], times[51] + 7 * DAY, TZ);

		expect(g.ticks.length).toBe(13);
		expect(g.formatTick(g.ticks[0])).toBe('1 — 28 July');
		expect(g.formatTick(g.ticks[6])).toBe("16 Dec '24 — 12 Jan '25");
	});
});

describe('computeEnergyGridlines — coarse calendar buckets', () => {
	const coarseLabel = (/** @type {Date} */ d) => `label:${d.getTime()}`;

	it('keeps gridlines at bucket starts but positions labels at band midpoints', () => {
		const times = Array.from({ length: 8 }, (_, i) => localMonthStart(2023, i * 3));
		const g = computeEnergyGridlines(
			rows(times),
			times[0],
			localMonthStart(2025, 0),
			TZ,
			coarseLabel
		);

		expect(g.gridlineTicks.map((t) => t.getTime())).toEqual(times);
		// Each label tick sits centred between consecutive bucket starts.
		expect(g.ticks.length).toBe(8);
		expect(g.ticks[0].getTime()).toBe((times[0] + times[1]) / 2);
		// The label resolves to the band's start bucket.
		expect(g.formatTick(g.ticks[0])).toBe(`label:${times[0]}`);
		expect(g.formatTick(g.ticks[7])).toBe(`label:${times[7]}`);
	});

	it('returns an empty label for non-midpoint dates', () => {
		const times = Array.from({ length: 8 }, (_, i) => localMonthStart(2023, i * 3));
		const g = computeEnergyGridlines(
			rows(times),
			times[0],
			localMonthStart(2025, 0),
			TZ,
			coarseLabel
		);

		expect(g.formatTick(new Date(times[1]))).toBe('');
	});

	it('thins to at most ~12 labelled buckets', () => {
		const times = Array.from({ length: 20 }, (_, i) => localMonthStart(2020, i * 3));
		const g = computeEnergyGridlines(
			rows(times),
			times[0],
			localMonthStart(2025, 0),
			TZ,
			coarseLabel
		);

		expect(g.gridlineTicks.length).toBe(10);
		expect(g.ticks.length).toBe(10);
		// Skipped bands are still labelled by their starting bucket.
		expect(g.formatTick(g.ticks[1])).toBe(`label:${times[2]}`);
	});
});
