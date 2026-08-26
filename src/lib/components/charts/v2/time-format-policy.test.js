import { describe, it, expect } from 'vitest';
import {
	getTimeFormatPolicy,
	formatRangeLabel,
	COARSE_BUCKET_INTERVALS
} from './time-format-policy.js';

const NEM = 'Australia/Brisbane'; // +10, no DST
const WEM = 'Australia/Perth'; // +08, no DST
const HOUR = 60 * 60 * 1000;

/** Local midnight in the given zone, as a UTC timestamp. */
const localMidnight = (
	/** @type {number} */ offsetHours,
	/** @type {number} */ y,
	/** @type {number} */ m0,
	/** @type {number} */ d = 1
) => Date.UTC(y, m0, d) - offsetHours * HOUR;

/** Normalise narrow/non-breaking spaces so assertions are ICU-version-safe. */
const clean = (/** @type {string} */ s) => s.replace(/[\u202f\u00a0]/g, ' ');

describe('getTimeFormatPolicy — tooltip labels', () => {
	it('renders date + time for sub-daily intervals', () => {
		// 21 Jan 2026 04:30 UTC → 14:30 Brisbane, 12:30 Perth
		const t = Date.UTC(2026, 0, 21, 4, 30);
		for (const di of ['5m', '30m', '1h']) {
			expect(clean(getTimeFormatPolicy(di, NEM).formatTooltip(t))).toBe('21 Jan 2026, 2:30 pm');
			expect(clean(getTimeFormatPolicy(di, WEM).formatTooltip(t))).toBe('21 Jan 2026, 12:30 pm');
		}
	});

	it('renders a full date for daily buckets', () => {
		const t = localMidnight(10, 2026, 0, 21);
		expect(getTimeFormatPolicy('1d', NEM).formatTooltip(t)).toBe('21 Jan 2026');
	});

	it('renders weekly buckets as an inclusive range with the year', () => {
		// Same month
		expect(getTimeFormatPolicy('7d', NEM).formatTooltip(localMidnight(10, 2025, 5, 16))).toBe(
			'16 — 22 June 2025'
		);
		// Cross month
		expect(getTimeFormatPolicy('7d', NEM).formatTooltip(localMidnight(10, 2025, 6, 28))).toBe(
			'28 July — 3 Aug 2025'
		);
		// Cross year keeps the two-digit year form on both sides
		expect(getTimeFormatPolicy('7d', NEM).formatTooltip(localMidnight(10, 2025, 11, 29))).toBe(
			"29 Dec '25 — 4 Jan '26"
		);
		// Timezone matters: the same instant is a different week start in WEM
		expect(getTimeFormatPolicy('7d', WEM).formatTooltip(localMidnight(8, 2025, 5, 16))).toBe(
			'16 — 22 June 2025'
		);
	});

	it('renders month + year for monthly and 3-monthly buckets', () => {
		const t = localMidnight(10, 2025, 5);
		expect(getTimeFormatPolicy('1M', NEM).formatTooltip(t)).toBe('June 2025');
		expect(getTimeFormatPolicy('3M', NEM).formatTooltip(t)).toBe('June 2025');
	});

	it('renders the year alone for yearly buckets', () => {
		expect(getTimeFormatPolicy('1y', NEM).formatTooltip(localMidnight(10, 2025, 0))).toBe('2025');
	});

	it('names quarters and half-years', () => {
		expect(getTimeFormatPolicy('quarter', NEM).formatTooltip(localMidnight(10, 2025, 3))).toBe(
			'Q2 2025'
		);
		expect(getTimeFormatPolicy('half', NEM).formatTooltip(localMidnight(10, 2025, 0))).toBe(
			'H1 2025'
		);
		expect(getTimeFormatPolicy('half', NEM).formatTooltip(localMidnight(10, 2025, 6))).toBe(
			'H2 2025'
		);
	});

	it('names financial years by their ending year, per network zone', () => {
		// 2025-06-30 14:00 UTC = 1 Jul 00:00 AEST but 30 Jun 22:00 AWST —
		// the same instant belongs to different FYs on each network.
		const boundary = Date.UTC(2025, 5, 30, 14, 0);
		expect(getTimeFormatPolicy('fy', NEM).formatTooltip(boundary)).toBe('FY2026');
		expect(getTimeFormatPolicy('fy', WEM).formatTooltip(boundary)).toBe('FY2025');
	});

	it('names seasons with summer crossing the year', () => {
		expect(getTimeFormatPolicy('season', NEM).formatTooltip(localMidnight(10, 2025, 1))).toBe(
			'Summer 2024/25'
		);
		expect(getTimeFormatPolicy('season', NEM).formatTooltip(localMidnight(10, 2025, 11))).toBe(
			'Summer 2025/26'
		);
		expect(getTimeFormatPolicy('season', NEM).formatTooltip(localMidnight(10, 2025, 5))).toBe(
			'Winter 2025'
		);
	});

	it('returns empty string for invalid dates', () => {
		for (const di of ['5m', '1d', '7d', '1M', 'quarter', 'fy', '1y', 'unknown']) {
			expect(getTimeFormatPolicy(di, NEM).formatTooltip(new Date('nope'))).toBe('');
		}
	});

	it('falls back to a full date for unknown intervals', () => {
		expect(getTimeFormatPolicy('unknown', NEM).formatTooltip(localMidnight(10, 2026, 0, 21))).toBe(
			'21 Jan 2026'
		);
	});
});

describe('getTimeFormatPolicy — bucket ticks', () => {
	it('provides an explicit axis labeller for coarse buckets (incl. yearly)', () => {
		for (const di of COARSE_BUCKET_INTERVALS) {
			const policy = getTimeFormatPolicy(di, NEM);
			expect(policy.bucketTick).toBeTypeOf('function');
			// Axis label matches the tooltip label for the same bucket.
			const t = localMidnight(10, 2025, 6);
			expect(policy.bucketTick?.(t)).toBe(policy.formatTooltip(t));
		}
	});

	it('defers to gridline inference for fine intervals', () => {
		for (const di of ['5m', '30m', '1h', '1d', '7d', '1M', '3M']) {
			expect(getTimeFormatPolicy(di, NEM).bucketTick).toBeNull();
		}
	});
});

describe('formatRangeLabel — interval-aware viewport labels', () => {
	it('names coarse bucket endpoints, collapsing a same-bucket range', () => {
		// Aug 2023 → Mar 2026 spans FY2024 – FY2026.
		expect(
			formatRangeLabel(localMidnight(10, 2023, 7), localMidnight(10, 2026, 2), 'fy', NEM)
		).toBe('FY2024 — FY2026');
		// Both ends inside FY2026 (Jul 2025 – Mar 2026) collapse to one name.
		expect(
			formatRangeLabel(localMidnight(10, 2025, 6), localMidnight(10, 2026, 2), 'fy', NEM)
		).toBe('FY2026');
		expect(
			formatRangeLabel(localMidnight(10, 2025, 0), localMidnight(10, 2026, 7), 'quarter', NEM)
		).toBe('Q1 2025 — Q3 2026');
		expect(
			formatRangeLabel(localMidnight(10, 2025, 5), localMidnight(10, 2026, 3), 'season', NEM)
		).toBe('Winter 2025 — Autumn 2026');
		expect(
			formatRangeLabel(localMidnight(10, 2024, 1), localMidnight(10, 2026, 9), 'half', NEM)
		).toBe('H1 2024 — H2 2026');
		expect(
			formatRangeLabel(localMidnight(10, 2024, 3), localMidnight(10, 2026, 5), '1y', NEM)
		).toBe('2024 — 2026');
	});

	it('labels monthly viewports by month, collapsing a single month', () => {
		expect(
			formatRangeLabel(localMidnight(10, 2025, 7), localMidnight(10, 2026, 7), '1M', NEM)
		).toBe('Aug 2025 — Aug 2026');
		expect(
			formatRangeLabel(localMidnight(10, 2026, 7, 1), localMidnight(10, 2026, 7, 28), '1M', NEM)
		).toBe('Aug 2026');
	});

	it('shows clock times and the network zone at sub-daily grains', () => {
		// 19 Aug 2026 00:00 UTC = 10:00 am Brisbane.
		const start = Date.UTC(2026, 7, 19);
		const end = Date.UTC(2026, 7, 26);
		expect(clean(formatRangeLabel(start, end, '30m', NEM))).toBe(
			'19 Aug 2026, 10:00 am — 26 Aug 2026, 10:00 am AEST'
		);
		expect(clean(formatRangeLabel(start, end, '5m', WEM))).toBe(
			'19 Aug 2026, 8:00 am — 26 Aug 2026, 8:00 am AWST'
		);
	});

	it('falls back to a plain date range at daily grains', () => {
		expect(
			formatRangeLabel(localMidnight(10, 2025, 7, 19), localMidnight(10, 2025, 7, 26), '1d', NEM)
		).toBe('19 — 26 Aug 2025');
	});
});
