import { describe, it, expect } from 'vitest';
import { getTimeFormatPolicy, COARSE_BUCKET_INTERVALS } from './time-format-policy.js';

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
