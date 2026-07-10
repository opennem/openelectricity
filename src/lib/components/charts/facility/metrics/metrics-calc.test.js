import { describe, it, expect } from 'vitest';
import {
	sumSeries,
	sumAllSeries,
	sumEnergy,
	getHoursInRange,
	getIntervalHours,
	isSubDailyData,
	capacityFactor,
	avgPriceReceived,
	peakBucket,
	runningHours,
	dcAcRatio,
	computeUnitAvailability
} from './metrics-calc.js';

// ── sumSeries ────────────────────────────────────────────────────────

describe('sumSeries', () => {
	it('sums numeric values for the given key', () => {
		const rows = [{ energy: 10 }, { energy: 20 }, { energy: 30 }];
		expect(sumSeries(rows, 'energy')).toBe(60);
	});

	it('ignores missing keys', () => {
		const rows = [{ energy: 10 }, { other: 5 }, { energy: 30 }];
		expect(sumSeries(rows, 'energy')).toBe(40);
	});

	it('ignores non-numeric values', () => {
		const rows = [{ energy: 10 }, { energy: 'bad' }, { energy: null }, { energy: NaN }];
		expect(sumSeries(rows, 'energy')).toBe(10);
	});

	it('returns 0 for empty rows', () => {
		expect(sumSeries([], 'energy')).toBe(0);
	});

	it('handles negative values', () => {
		const rows = [{ val: -10 }, { val: 5 }, { val: -3 }];
		expect(sumSeries(rows, 'val')).toBe(-8);
	});
});

// ── sumAllSeries ─────────────────────────────────────────────────────

describe('sumAllSeries', () => {
	it('sums several keys across rows', () => {
		const rows = [
			{ a: 1, b: 2 },
			{ a: 3, b: 4 }
		];
		expect(sumAllSeries(rows, ['a', 'b'])).toBe(10);
	});

	it('returns 0 for no keys', () => {
		expect(sumAllSeries([{ a: 1 }], [])).toBe(0);
	});
});

describe('sumEnergy', () => {
	it('folds signed, throughput and the discharge/charge split in one pass', () => {
		const rows = [
			{ a: 10, b: -4 },
			{ a: -6, b: 2 }
		];
		expect(sumEnergy(rows, ['a', 'b'])).toEqual({
			signed: 2,
			throughput: 22,
			discharge: 12,
			charge: 10
		});
	});

	it('ignores non-numeric and NaN values', () => {
		const rows = [{ a: 5, b: null }, { a: NaN, b: 'x' }, { a: undefined }];
		expect(sumEnergy(rows, ['a', 'b'])).toEqual({
			signed: 5,
			throughput: 5,
			discharge: 5,
			charge: 0
		});
	});

	it('returns zeros for empty rows or keys', () => {
		expect(sumEnergy([], ['a'])).toEqual({ signed: 0, throughput: 0, discharge: 0, charge: 0 });
		expect(sumEnergy([{ a: 1 }], [])).toEqual({
			signed: 0,
			throughput: 0,
			discharge: 0,
			charge: 0
		});
	});
});

// ── getHoursInRange ──────────────────────────────────────────────────

describe('getHoursInRange', () => {
	it('returns hours between first and last row', () => {
		const rows = [{ time: 0 }, { time: 3_600_000 }, { time: 7_200_000 }];
		expect(getHoursInRange(rows)).toBe(2);
	});

	it('returns 0 for empty rows', () => {
		expect(getHoursInRange([])).toBe(0);
	});

	it('returns 0 for single row', () => {
		expect(getHoursInRange([{ time: 1000 }])).toBe(0);
	});

	it('handles 7-day range', () => {
		const sevenDaysMs = 7 * 24 * 3_600_000;
		const rows = [{ time: 0 }, { time: sevenDaysMs }];
		expect(getHoursInRange(rows)).toBe(168);
	});
});

// ── getIntervalHours ─────────────────────────────────────────────────

describe('getIntervalHours', () => {
	it('returns the gap between the first two rows in hours', () => {
		expect(getIntervalHours([{ time: 0 }, { time: 1_800_000 }])).toBe(0.5);
	});

	it('returns 0 with fewer than two rows', () => {
		expect(getIntervalHours([{ time: 0 }])).toBe(0);
		expect(getIntervalHours([])).toBe(0);
	});
});

// ── isSubDailyData ───────────────────────────────────────────────────

describe('isSubDailyData', () => {
	it('is true for 5-minute data', () => {
		expect(isSubDailyData([{ time: 0 }, { time: 300_000 }])).toBe(true);
	});

	it('is true for 30-minute data', () => {
		expect(isSubDailyData([{ time: 0 }, { time: 1_800_000 }])).toBe(true);
	});

	it('is false for daily data', () => {
		expect(isSubDailyData([{ time: 0 }, { time: 24 * 3_600_000 }])).toBe(false);
	});

	it('is false with fewer than two rows', () => {
		expect(isSubDailyData([{ time: 0 }])).toBe(false);
		expect(isSubDailyData([])).toBe(false);
	});
});

// ── capacityFactor ───────────────────────────────────────────────────

describe('capacityFactor', () => {
	it('calculates capacity factor as percentage', () => {
		expect(capacityFactor(500, 10, 100)).toBe(50);
	});

	it('returns 100% when energy equals theoretical max', () => {
		expect(capacityFactor(1000, 10, 100)).toBe(100);
	});

	it('returns 0 when capacity is 0', () => {
		expect(capacityFactor(500, 0, 100)).toBe(0);
	});

	it('returns 0 when hours is 0', () => {
		expect(capacityFactor(500, 10, 0)).toBe(0);
	});

	it('returns 0 when capacity is negative', () => {
		expect(capacityFactor(500, -10, 100)).toBe(0);
	});
});

// ── avgPriceReceived ─────────────────────────────────────────────────

describe('avgPriceReceived', () => {
	it('calculates $/MWh', () => {
		expect(avgPriceReceived(5000, 100)).toBe(50);
	});

	it('returns 0 when energy is 0', () => {
		expect(avgPriceReceived(5000, 0)).toBe(0);
	});

	it('handles negative market value', () => {
		expect(avgPriceReceived(-1000, 100)).toBe(-10);
	});
});

// ── peakBucket ───────────────────────────────────────────────────────

describe('peakBucket', () => {
	it('returns the peak value tagged with its timestamp', () => {
		const rows = [
			{ time: 1, date: 'a', unit1: 50, unit2: 30 },
			{ time: 2, date: 'b', unit1: 80, unit2: 40 },
			{ time: 3, date: 'c', unit1: 60, unit2: 20 }
		];
		expect(peakBucket(rows, ['unit1', 'unit2'])).toEqual({ value: 120, time: 2, date: 'b' });
	});

	it('ignores negative values when totalling a row', () => {
		const rows = [{ time: 1, date: 'a', unit1: 100, unit2: -50 }];
		expect(peakBucket(rows, ['unit1', 'unit2'])).toEqual({ value: 100, time: 1, date: 'a' });
	});

	it('divides energy to power when intervalHours is provided', () => {
		const rows = [
			{ time: 1, date: 'a', unit1: 50 },
			{ time: 2, date: 'b', unit1: 240 }
		];
		expect(peakBucket(rows, ['unit1'], 24)).toEqual({ value: 10, time: 2, date: 'b' });
	});

	it('converts correctly for 5-minute intervals', () => {
		const rows = [{ time: 1, date: 'a', unit1: 10 }];
		expect(peakBucket(rows, ['unit1'], 5 / 60)?.value).toBeCloseTo(120);
	});

	it('returns null for empty rows', () => {
		expect(peakBucket([], ['unit1'])).toBeNull();
	});
});

// ── runningHours ─────────────────────────────────────────────────────

describe('runningHours', () => {
	it('counts intervals with power > 0 and converts to hours', () => {
		const data = [
			{ power: 100 },
			{ power: 0 },
			{ power: 50 },
			{ power: 0 },
			{ power: 200 },
			{ power: 150 }
		];
		expect(runningHours(data, ['power'], 5)).toBeCloseTo((4 * 5) / 60);
	});

	it('returns 0 when no power generated', () => {
		const data = [{ power: 0 }, { power: 0 }];
		expect(runningHours(data, ['power'], 5)).toBe(0);
	});

	it('counts across multiple series', () => {
		const data = [
			{ u1: 0, u2: 10 },
			{ u1: 0, u2: 0 },
			{ u1: 5, u2: 0 }
		];
		expect(runningHours(data, ['u1', 'u2'], 30)).toBe(1);
	});

	it('returns 0 for empty data', () => {
		expect(runningHours([], ['power'], 5)).toBe(0);
	});
});

// ── dcAcRatio ────────────────────────────────────────────────────────

describe('dcAcRatio', () => {
	it('calculates DC:AC ratio', () => {
		expect(dcAcRatio(588, 450)).toBeCloseTo(1.307, 2);
	});

	it('returns null when ratio is too low (< 1.05)', () => {
		expect(dcAcRatio(100, 100)).toBeNull();
	});

	it('returns null when ratio is too high (> 3)', () => {
		expect(dcAcRatio(400, 100)).toBeNull();
	});

	it('returns null when capacityRegistered is 0', () => {
		expect(dcAcRatio(0, 100)).toBeNull();
	});

	it('returns null when capacityMaximum is 0', () => {
		expect(dcAcRatio(100, 0)).toBeNull();
	});

	it('returns null for falsy inputs', () => {
		expect(dcAcRatio(null, 100)).toBeNull();
		expect(dcAcRatio(100, null)).toBeNull();
		expect(dcAcRatio(undefined, undefined)).toBeNull();
	});

	it('accepts typical solar oversizing ratios', () => {
		expect(dcAcRatio(130, 100)).toBeCloseTo(1.3, 1);
		expect(dcAcRatio(140, 100)).toBeCloseTo(1.4, 1);
	});
});

// ── computeUnitAvailability ──────────────────────────────────────────

describe('computeUnitAvailability', () => {
	it('returns the share of non-null intervals where the unit generated', () => {
		const rows = [
			{ power_U1: 10, power_U2: 0 },
			{ power_U1: 0, power_U2: 0 },
			{ power_U1: 5, power_U2: null },
			{ power_U1: 20, power_U2: 8 }
		];
		const result = computeUnitAvailability(rows, ['power_U1', 'power_U2']);
		expect(result[0]).toEqual({ unit: 'U1', seriesName: 'power_U1', availability: 75 });
		// U2: one null skipped → 3 counted, 1 generating → 33.33%
		expect(result[1].unit).toBe('U2');
		expect(result[1].availability).toBeCloseTo(100 / 3);
	});

	it('returns empty for no rows or no series', () => {
		expect(computeUnitAvailability([], ['power_U1'])).toEqual([]);
		expect(computeUnitAvailability([{ power_U1: 1 }], [])).toEqual([]);
	});
});
