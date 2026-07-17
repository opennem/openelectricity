import { describe, it, expect } from 'vitest';
import {
	formatTooltipDateTime,
	getPowerAxisTicks,
	applyFacilityTimeAxis,
	formatBucketLabel,
	getStartOfDay,
	getDayStartDates
} from './formatters.js';

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
	it('generates day-start ticks across the whole viewport for spans wider than 2 days', () => {
		const start = Date.UTC(2026, 0, 21, 0, 0); // 10:00 local, 21 Jan
		const end = start + 5 * 24 * HOUR;
		const { ticks, formatTick } = getPowerAxisTicks(start, end, TZ, OFFSET);
		// One local day start per day, viewport-derived (no data involved): the
		// day start containing viewStart (21 Jan local) through 26 Jan local.
		expect(ticks.length).toBe(6);
		expect(ticks[0].getTime()).toBe(Date.UTC(2026, 0, 20, 14, 0)); // 21 Jan 00:00 AEST
		expect(ticks[5].getTime()).toBe(Date.UTC(2026, 0, 25, 14, 0)); // 26 Jan 00:00 AEST
		// Day-start ticks label as "21 Jan" — no time-of-day.
		expect(formatTick(ticks[0])).toMatch(/Jan/);
		expect(formatTick(ticks[0]).toLowerCase()).not.toMatch(/am|pm/);
	});

	it('emits intra-day time ticks when zoomed in', () => {
		// Brisbane 10:00–16:00 on 21 Jan (6h span).
		const start = Date.UTC(2026, 0, 21, 0, 0); // +10 → 10:00 local
		const end = start + 6 * HOUR;
		const { ticks, formatTick } = getPowerAxisTicks(start, end, TZ, OFFSET);
		expect(ticks.length).toBeGreaterThanOrEqual(5);
		// Every tick in this window is a time-of-day label.
		expect(formatTick(ticks[1]).toLowerCase()).toMatch(/am|pm/);
	});

	it('labels local midnight with the date instead of a time', () => {
		// Brisbane 22:00 21 Jan → 04:00 22 Jan (crosses midnight).
		const start = Date.UTC(2026, 0, 21, 12, 0); // +10 → 22:00 local
		const end = start + 6 * HOUR;
		const { ticks, formatTick } = getPowerAxisTicks(start, end, TZ, OFFSET);
		const labels = ticks.map((t) => formatTick(t));
		// Exactly one tick falls on local midnight and renders as a date.
		expect(labels.some((l) => /Jan/.test(l))).toBe(true);
		expect(labels.some((l) => /am|pm/i.test(l))).toBe(true);
	});
});

describe('applyFacilityTimeAxis with empty/partial data', () => {
	const DAY = 24 * HOUR;

	/**
	 * Minimal ChartStore stand-in — the function only assigns these fields.
	 * @returns {{ xTicks: Date[] | undefined, xGridlineTicks: Date[] | undefined, formatTickX: ((d: any) => string) | undefined }}
	 */
	function makeStore() {
		return { xTicks: undefined, xGridlineTicks: undefined, formatTickX: undefined };
	}

	it('produces viewport-spanning energy ticks with no data (1d)', () => {
		const store = makeStore();
		const viewStart = Date.UTC(2026, 0, 1, 14, 0); // 2 Jan 00:00 AEST
		const viewEnd = viewStart + 30 * DAY;
		applyFacilityTimeAxis(store, {
			data: [],
			viewStart,
			viewEnd,
			ianaTimeZone: TZ,
			timeZone: OFFSET,
			isEnergy: true,
			displayInterval: '1d'
		});
		const gridlines = /** @type {Date[]} */ (store.xGridlineTicks);
		expect(gridlines.length).toBeGreaterThan(0);
		expect(gridlines[0].getTime()).toBeLessThanOrEqual(viewStart);
		expect(gridlines[gridlines.length - 1].getTime()).toBeGreaterThan(viewEnd - 8 * DAY);
	});

	it('produces viewport-spanning calendar ticks with no data (1M)', () => {
		const store = makeStore();
		const viewStart = Date.UTC(2025, 10, 15) - 10 * HOUR;
		const viewEnd = Date.UTC(2026, 5, 15) - 10 * HOUR;
		applyFacilityTimeAxis(store, {
			data: [],
			viewStart,
			viewEnd,
			ianaTimeZone: TZ,
			timeZone: OFFSET,
			isEnergy: true,
			displayInterval: '1M'
		});
		const gridlines = /** @type {Date[]} */ (store.xGridlineTicks);
		// Month starts Nov 2025 → Jun 2026 inclusive.
		expect(gridlines.length).toBe(8);
		expect(gridlines[0].getTime()).toBe(Date.UTC(2025, 10, 1) - 10 * HOUR);
		expect(gridlines[7].getTime()).toBe(Date.UTC(2026, 5, 1) - 10 * HOUR);
	});

	it('anchors the 1d lattice to the first row and still spans the empty half', () => {
		const store = makeStore();
		const dayStart = Date.UTC(2026, 0, 9, 14, 0); // 10 Jan 00:00 AEST
		const viewStart = dayStart - 5 * DAY; // 5 empty days before the data
		const viewEnd = dayStart + 5 * DAY;
		const data = Array.from({ length: 5 }, (_, i) => ({ time: dayStart + i * DAY }));
		applyFacilityTimeAxis(store, {
			data,
			viewStart,
			viewEnd,
			ianaTimeZone: TZ,
			timeZone: OFFSET,
			isEnergy: true,
			displayInterval: '1d'
		});
		const gridlines = /** @type {Date[]} */ (store.xGridlineTicks);
		// Lattice phase matches the rows and covers the whole viewport.
		expect(gridlines.some((d) => d.getTime() === dayStart)).toBe(true);
		expect(gridlines[0].getTime()).toBeLessThanOrEqual(viewStart);
		expect((gridlines[1].getTime() - gridlines[0].getTime()) % DAY).toBe(0);
	});

	it('produces viewport-spanning power day ticks with no data', () => {
		const store = makeStore();
		const viewStart = Date.UTC(2026, 0, 1);
		const viewEnd = viewStart + 7 * DAY;
		applyFacilityTimeAxis(store, {
			data: [],
			viewStart,
			viewEnd,
			ianaTimeZone: TZ,
			timeZone: OFFSET,
			isEnergy: false,
			displayInterval: '30m'
		});
		const ticks = /** @type {Date[]} */ (store.xTicks);
		expect(ticks.length).toBe(8);
		expect(typeof store.formatTickX).toBe('function');
	});
});

describe('getStartOfDay', () => {
	/**
	 * Reference implementation: the Intl-based path (what unknown zones use and
	 * what the arithmetic fast path for the fixed-offset AU zones must match).
	 * @param {Date} date
	 * @param {string} ianaTimeZone
	 * @param {string} timeZone
	 */
	function intlStartOfDay(date, ianaTimeZone, timeZone) {
		const formatter = new Intl.DateTimeFormat('en-AU', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			timeZone: ianaTimeZone
		});
		const parts = formatter.formatToParts(date);
		const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0');
		const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0') - 1;
		const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0');
		const offsetHours = timeZone === '+08:00' ? 8 : 10;
		return new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));
	}

	const ZONES = [
		{ iana: 'Australia/Brisbane', offset: '+10:00' },
		{ iana: 'Australia/Perth', offset: '+08:00' }
	];

	it('matches the Intl path across day boundaries for both fixed-offset zones', () => {
		for (const { iana, offset } of ZONES) {
			// Sweep hourly across several days, including the local-midnight edges.
			const base = Date.UTC(2026, 5, 28, 0, 0);
			for (let h = 0; h < 96; h++) {
				const date = new Date(base + h * HOUR);
				expect(getStartOfDay(date, iana, offset).getTime(), `${iana} +${h}h`).toBe(
					intlStartOfDay(date, iana, offset).getTime()
				);
			}
		}
	});

	it('returns local midnight as a UTC instant', () => {
		// 2026-01-21 13:59 UTC = 23:59 Brisbane → day start 2026-01-21 00:00 +10 (14:00 UTC on the 20th)
		const d = new Date(Date.UTC(2026, 0, 21, 13, 59));
		expect(getStartOfDay(d, 'Australia/Brisbane', '+10:00').toISOString()).toBe(
			'2026-01-20T14:00:00.000Z'
		);
		// One minute later it's past local midnight → next day start
		const d2 = new Date(Date.UTC(2026, 0, 21, 14, 0));
		expect(getStartOfDay(d2, 'Australia/Brisbane', '+10:00').toISOString()).toBe(
			'2026-01-21T14:00:00.000Z'
		);
	});
});

describe('getDayStartDates', () => {
	const rows = (/** @type {number[]} */ times) =>
		times.map((t) => ({ time: t, date: new Date(t) }));

	it('dedupes rows to unique sorted day starts', () => {
		const base = Date.UTC(2026, 0, 20, 14, 0); // local midnight 21 Jan AEST
		const data = rows([base + 26 * HOUR, base + 2 * HOUR, base + 1 * HOUR, base + 30 * HOUR]);
		const starts = getDayStartDates(data, TZ, OFFSET);
		expect(starts.map((d) => d.toISOString())).toEqual([
			'2026-01-20T14:00:00.000Z',
			'2026-01-21T14:00:00.000Z'
		]);
	});

	it('memoises on the same rows array reference', () => {
		const data = rows([Date.UTC(2026, 0, 21, 0, 0), Date.UTC(2026, 0, 22, 0, 0)]);
		const first = getDayStartDates(data, TZ, OFFSET);
		expect(getDayStartDates(data, TZ, OFFSET)).toBe(first);
		// Different inputs invalidate the memo
		expect(getDayStartDates(data, 'Australia/Perth', '+08:00')).not.toBe(first);
	});
});
