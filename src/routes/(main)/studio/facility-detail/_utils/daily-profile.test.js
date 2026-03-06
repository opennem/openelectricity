import { describe, it, expect } from 'vitest';
import { computeDailyProfile, isSubDailyData } from './daily-profile.js';

// ── computeDailyProfile ──────────────────────────────────────────────

describe('computeDailyProfile', () => {
	it('returns 24 buckets', () => {
		const result = computeDailyProfile([], [], '+10:00');
		expect(result).toHaveLength(24);
		expect(result[0]).toEqual({ hour: 0, total: 0 });
		expect(result[23]).toEqual({ hour: 23, total: 0 });
	});

	it('buckets data by local hour', () => {
		// Create rows at UTC midnight → local 10:00 AEST (+10:00)
		const utcMidnight = new Date('2024-01-15T00:00:00Z').getTime();
		const rows = [
			{ time: utcMidnight, power: 100 },
			{ time: utcMidnight + 3_600_000, power: 200 } // UTC 01:00 → local 11:00
		];

		const result = computeDailyProfile(rows, ['power'], '+10:00');
		expect(result[10].total).toBe(100); // hour 10 AEST
		expect(result[11].total).toBe(200); // hour 11 AEST
		expect(result[0].total).toBe(0); // no data at midnight local
	});

	it('averages across multiple rows in the same hour', () => {
		const baseTime = new Date('2024-01-15T00:00:00Z').getTime(); // → local hour 10
		const rows = [
			{ time: baseTime, power: 100 },
			{ time: baseTime + 300_000, power: 200 }, // 5m later, same hour
			{ time: baseTime + 600_000, power: 300 } // 10m later, same hour
		];

		const result = computeDailyProfile(rows, ['power'], '+10:00');
		expect(result[10].total).toBe(200); // avg of 100, 200, 300
	});

	it('sums across multiple series per row', () => {
		const baseTime = new Date('2024-01-15T00:00:00Z').getTime();
		const rows = [{ time: baseTime, unit1: 50, unit2: 30 }];

		const result = computeDailyProfile(rows, ['unit1', 'unit2'], '+10:00');
		expect(result[10].total).toBe(80); // 50 + 30
	});

	it('handles WEM timezone (+08:00)', () => {
		const utcMidnight = new Date('2024-01-15T00:00:00Z').getTime();
		const rows = [{ time: utcMidnight, power: 100 }];

		const result = computeDailyProfile(rows, ['power'], '+08:00');
		expect(result[8].total).toBe(100); // UTC 00:00 → AWST 08:00
	});

	it('ignores rows with null/undefined time', () => {
		const rows = [
			{ time: null, power: 100 },
			{ time: undefined, power: 200 }
		];

		const result = computeDailyProfile(rows, ['power'], '+10:00');
		const totalSum = result.reduce((s, b) => s + b.total, 0);
		expect(totalSum).toBe(0);
	});

	it('ignores non-numeric series values', () => {
		const baseTime = new Date('2024-01-15T00:00:00Z').getTime();
		const rows = [
			{ time: baseTime, power: 'bad' },
			{ time: baseTime, power: null }
		];

		const result = computeDailyProfile(rows, ['power'], '+10:00');
		expect(result[10].total).toBe(0);
	});

	it('handles negative power values (e.g. battery charging)', () => {
		const baseTime = new Date('2024-01-15T00:00:00Z').getTime();
		const rows = [{ time: baseTime, power: -50 }];

		const result = computeDailyProfile(rows, ['power'], '+10:00');
		expect(result[10].total).toBe(-50);
	});

	it('defaults to +10:00 when timezone is empty', () => {
		const utcMidnight = new Date('2024-01-15T00:00:00Z').getTime();
		const rows = [{ time: utcMidnight, power: 100 }];

		const result = computeDailyProfile(rows, ['power'], '');
		expect(result[10].total).toBe(100);
	});

	it('averages across multiple days', () => {
		const day1 = new Date('2024-01-15T00:00:00Z').getTime(); // local hour 10
		const day2 = new Date('2024-01-16T00:00:00Z').getTime(); // local hour 10
		const rows = [
			{ time: day1, power: 100 },
			{ time: day2, power: 200 }
		];

		const result = computeDailyProfile(rows, ['power'], '+10:00');
		expect(result[10].total).toBe(150); // avg of 100, 200
	});
});

// ── isSubDailyData ───────────────────────────────────────────────────

describe('isSubDailyData', () => {
	it('returns true for 5-minute data', () => {
		const rows = [
			{ time: 0 },
			{ time: 300_000 } // 5m
		];
		expect(isSubDailyData(rows)).toBe(true);
	});

	it('returns true for 30-minute data', () => {
		const rows = [
			{ time: 0 },
			{ time: 1_800_000 } // 30m
		];
		expect(isSubDailyData(rows)).toBe(true);
	});

	it('returns true for 1-hour data', () => {
		const rows = [
			{ time: 0 },
			{ time: 3_600_000 } // 1h
		];
		expect(isSubDailyData(rows)).toBe(true);
	});

	it('returns false for daily data', () => {
		const rows = [
			{ time: 0 },
			{ time: 86_400_000 } // 1d
		];
		expect(isSubDailyData(rows)).toBe(false);
	});

	it('returns false for empty data', () => {
		expect(isSubDailyData([])).toBe(false);
	});

	it('returns false for single row', () => {
		expect(isSubDailyData([{ time: 0 }])).toBe(false);
	});
});
