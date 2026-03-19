import { describe, it, expect } from 'vitest';
import {
	mergeHistoricalEmissionsData,
	mutateDatesToStartOfYear,
	covertHistoryDataToTWh,
	getFinancialYear,
	currentFinancialYear
} from './utils.js';

/**
 * Helper to create a mock StatsData object
 * @param {object} overrides
 * @returns {any}
 */
function makeStatsData(overrides = {}) {
	return {
		id: 'au.fuel_tech.solar.energy',
		code: 'solar',
		fuel_tech: 'solar',
		units: 'GWh',
		history: {
			start: '2020-01-01T00:00:00',
			last: '2020-03-01T00:00:00',
			interval: '1M',
			data: [100, 200, 300]
		},
		...overrides
	};
}

describe('mergeHistoricalEmissionsData', () => {
	it('sums emissions from multiple fuel techs into a single total', () => {
		const historyData = [
			makeStatsData({ fuel_tech: 'coal', history: { data: [10, 20, 30] } }),
			makeStatsData({ fuel_tech: 'gas', history: { data: [5, 10, 15] } })
		];

		const result = mergeHistoricalEmissionsData(historyData, false);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('au.emissions.total');
		expect(result[0].code).toBe('none');
		expect(result[0].fuel_tech).toBeNull();
		expect(result[0].history.data).toEqual([15, 30, 45]);
	});

	it('negates export values when includeBatteryAndLoads is true', () => {
		const historyData = [
			makeStatsData({ fuel_tech: 'coal', history: { data: [100, 200, 300] } }),
			makeStatsData({ fuel_tech: 'exports', history: { data: [10, 20, 30] } })
		];

		const result = mergeHistoricalEmissionsData(historyData, true);

		expect(result[0].history.data).toEqual([90, 180, 270]);
	});

	it('zeroes export values when includeBatteryAndLoads is false', () => {
		const historyData = [
			makeStatsData({ fuel_tech: 'coal', history: { data: [100, 200, 300] } }),
			makeStatsData({ fuel_tech: 'exports', history: { data: [10, 20, 30] } })
		];

		const result = mergeHistoricalEmissionsData(historyData, false);

		expect(result[0].history.data).toEqual([100, 200, 300]);
	});

	it('treats null values as zero', () => {
		const historyData = [
			makeStatsData({ fuel_tech: 'coal', history: { data: [null, 50, null] } }),
			makeStatsData({ fuel_tech: 'gas', history: { data: [10, null, 30] } })
		];

		const result = mergeHistoricalEmissionsData(historyData, false);

		expect(result[0].history.data).toEqual([10, 50, 30]);
	});

	it('handles a single fuel tech entry', () => {
		const historyData = [
			makeStatsData({ fuel_tech: 'wind', history: { data: [7, 14, 21] } })
		];

		const result = mergeHistoricalEmissionsData(historyData, false);

		expect(result).toHaveLength(1);
		expect(result[0].history.data).toEqual([7, 14, 21]);
	});
});

describe('mutateDatesToStartOfYear', () => {
	it('transforms dates to the start of their respective year', () => {
		const data = [
			{ date: new Date('2022-06-15T12:00:00'), time: 0, value: 100 },
			{ date: new Date('2023-09-20T08:30:00'), time: 0, value: 200 }
		];

		const result = mutateDatesToStartOfYear(data);

		expect(result[0].date).toEqual(new Date('2022-01-01T00:00:00'));
		expect(result[0].time).toBe(new Date('2022-01-01T00:00:00').getTime());
		expect(result[1].date).toEqual(new Date('2023-01-01T00:00:00'));
		expect(result[1].time).toBe(new Date('2023-01-01T00:00:00').getTime());
	});

	it('adds additional years when specified', () => {
		const data = [
			{ date: new Date('2022-06-15T12:00:00'), time: 0, value: 100 }
		];

		const result = mutateDatesToStartOfYear(data, 3);

		expect(result[0].date).toEqual(new Date('2025-01-01T00:00:00'));
		expect(result[0].time).toBe(new Date('2025-01-01T00:00:00').getTime());
	});

	it('defaults to zero additional years', () => {
		const data = [
			{ date: new Date('2024-11-30T23:59:59'), time: 0, value: 50 }
		];

		const result = mutateDatesToStartOfYear(data);

		expect(result[0].date).toEqual(new Date('2024-01-01T00:00:00'));
	});

	it('preserves other properties on the data objects', () => {
		const data = [
			{ date: new Date('2022-03-01'), time: 0, value: 42, label: 'test' }
		];

		const result = mutateDatesToStartOfYear(data);

		expect(result[0].value).toBe(42);
		expect(result[0].label).toBe('test');
	});

	it('returns a new array without mutating the original', () => {
		const original = [{ date: new Date('2022-06-15'), time: 0, value: 1 }];
		const result = mutateDatesToStartOfYear(original);

		expect(result).not.toBe(original);
		expect(result[0]).not.toBe(original[0]);
	});

	it('FY rollup output: end-of-FY date 2024-06-30 becomes 2024-01-01', () => {
		const data = [{ date: new Date('2024-06-30'), time: 0, value: 1 }];
		const result = mutateDatesToStartOfYear(data);
		expect(result[0].date).toEqual(new Date('2024-01-01T00:00:00'));
	});

	it('projection date with additionalYears=1: 2024-01-01 becomes 2025-01-01', () => {
		const data = [{ date: new Date('2024-01-01'), time: 0, value: 1 }];
		const result = mutateDatesToStartOfYear(data, 1);
		expect(result[0].date).toEqual(new Date('2025-01-01T00:00:00'));
	});

	it('raw projection 2024-07-01 with startOfYear + additionalYears=1 yields FY2025', () => {
		// Simulates the full pipeline: raw projection date → startOfYear → +1
		const data = [{ date: new Date('2024-07-01'), time: 0, value: 1 }];
		const result = mutateDatesToStartOfYear(data, 1);
		expect(result[0].date).toEqual(new Date('2025-01-01T00:00:00'));
		expect(result[0].date.getFullYear()).toBe(2025);
	});
});

describe('getFinancialYear', () => {
	it('returns the same year for Jan–Jun (first half of FY)', () => {
		expect(getFinancialYear(new Date('2026-01-15'))).toBe(2026);
		expect(getFinancialYear(new Date('2026-03-01'))).toBe(2026);
		expect(getFinancialYear(new Date('2026-06-30'))).toBe(2026);
	});

	it('returns year + 1 for Jul–Dec (second half of FY)', () => {
		expect(getFinancialYear(new Date('2025-07-01'))).toBe(2026);
		expect(getFinancialYear(new Date('2025-09-15'))).toBe(2026);
		expect(getFinancialYear(new Date('2025-12-31'))).toBe(2026);
	});

	it('handles the Jul boundary correctly', () => {
		// June 30 → same year
		expect(getFinancialYear(new Date('2025-06-30'))).toBe(2025);
		// July 1 → next year
		expect(getFinancialYear(new Date('2025-07-01'))).toBe(2026);
	});
});

describe('currentFinancialYear', () => {
	it('matches getFinancialYear for the current date', () => {
		expect(currentFinancialYear).toBe(getFinancialYear(new Date()));
	});

	it('is a number that can be used as an upper bound filter', () => {
		expect(typeof currentFinancialYear).toBe('number');
		// The last complete FY should pass this filter
		const lastCompleteFY = currentFinancialYear - 1;
		expect(lastCompleteFY < currentFinancialYear).toBe(true);
		// The current incomplete FY should be excluded
		expect(currentFinancialYear < currentFinancialYear).toBe(false);
	});
});

describe('covertHistoryDataToTWh', () => {
	it('divides history data values by 1000', () => {
		const data = [
			makeStatsData({ units: 'GWh', history: { data: [1000, 2000, 3000] } })
		];

		const result = covertHistoryDataToTWh(data);

		expect(result[0].history.data).toEqual([1, 2, 3]);
	});

	it('changes units to TWh', () => {
		const data = [makeStatsData({ units: 'GWh', history: { data: [500] } })];

		const result = covertHistoryDataToTWh(data);

		expect(result[0].units).toBe('TWh');
	});

	it('preserves null values as null', () => {
		const data = [
			makeStatsData({ units: 'GWh', history: { data: [1000, null, 3000] } })
		];

		const result = covertHistoryDataToTWh(data);

		expect(result[0].history.data).toEqual([1, null, 3]);
	});

	it('handles multiple StatsData entries', () => {
		const data = [
			makeStatsData({ id: 'a', units: 'GWh', history: { data: [2000] } }),
			makeStatsData({ id: 'b', units: 'GWh', history: { data: [4000] } })
		];

		const result = covertHistoryDataToTWh(data);

		expect(result[0].history.data).toEqual([2]);
		expect(result[0].units).toBe('TWh');
		expect(result[1].history.data).toEqual([4]);
		expect(result[1].units).toBe('TWh');
	});

	it('handles fractional values', () => {
		const data = [makeStatsData({ units: 'GWh', history: { data: [1500] } })];

		const result = covertHistoryDataToTWh(data);

		expect(result[0].history.data).toEqual([1.5]);
	});
});
