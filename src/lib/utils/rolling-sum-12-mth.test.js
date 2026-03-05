import { describe, it, expect } from 'vitest';
import rollingSum12Mth from './rolling-sum-12-mth.js';

/**
 * Create monthly data points starting from Jan of the given year.
 * Each entry has a date and values for the provided keys.
 *
 * @param {number} startYear
 * @param {number} months - number of monthly data points
 * @param {Record<string, (number | null)[]>} keyValues - key name to array of values
 * @returns {TimeSeriesData[]}
 */
function makeMonthlyData(startYear, months, keyValues) {
	return Array.from({ length: months }, (_, i) => {
		const date = new Date(startYear, i, 1);
		/** @type {TimeSeriesData} */
		const entry = { time: date.getTime(), date };

		for (const [key, values] of Object.entries(keyValues)) {
			entry[key] = values[i];
		}

		return entry;
	});
}

describe('rollingSum12Mth', () => {
	it('calculates a 12-month rolling sum for a single key', () => {
		// 14 months of data (Jan 2020 – Feb 2021), value = 10 each month
		const values = Array(14).fill(10);
		const data = makeMonthlyData(2020, 14, { energy: values });

		const result = rollingSum12Mth(data, ['energy']);

		// First 12 months are filtered out as incomplete.
		// Month index 12 (Jan 2021) has a complete 12-month window but is excluded
		// because the filter uses strict isAfter (not >=).
		// Month index 13 (Feb 2021) sums months 2–13 (indices 1–13) = 13 × 10 = 130
		// Wait — the window for Feb 2021 is (Feb 2020, Feb 2021].
		// That includes Mar 2020 – Feb 2021 = 12 months, but the current point is
		// also included, so sum = current + lookback within window.
		// Let's verify: the function sums current + all prior within 12 months.

		// With 14 months and the filter excluding dates <= firstDate + 12 months,
		// only Feb 2021 (index 13) passes the filter.
		expect(result).toHaveLength(1);

		// Feb 2021 window: subMonths(Feb 2021, 12) = Feb 2020.
		// It sums current (Feb 2021) + all dates after Feb 2020.
		// Dates after Feb 2020: Mar 2020 (idx 2) through Jan 2021 (idx 12) = 11 months.
		// Total = 12 values × 10 = 120.
		expect(result[0].energy).toBe(120);
	});

	it('calculates rolling sums for multiple keys independently', () => {
		const data = makeMonthlyData(2020, 14, {
			solar: Array(14).fill(5),
			wind: Array(14).fill(3)
		});

		const result = rollingSum12Mth(data, ['solar', 'wind']);

		expect(result).toHaveLength(1);
		expect(result[0].solar).toBe(60); // 12 × 5
		expect(result[0].wind).toBe(36); // 12 × 3
	});

	it('returns null when any value in the window is null', () => {
		const values = Array(14).fill(10);
		values[5] = null; // Jun 2020 is null

		const data = makeMonthlyData(2020, 14, { energy: values });
		const result = rollingSum12Mth(data, ['energy']);

		// Feb 2021 window includes Jun 2020, so the result should be null.
		expect(result).toHaveLength(1);
		expect(result[0].energy).toBeNull();
	});

	it('treats zero as a valid value, not null', () => {
		const values = Array(14).fill(10);
		values[5] = 0; // Jun 2020 is 0

		const data = makeMonthlyData(2020, 14, { energy: values });
		const result = rollingSum12Mth(data, ['energy']);

		expect(result).toHaveLength(1);
		// 11 × 10 + 0 = 110
		expect(result[0].energy).toBe(110);
	});

	it('filters out incomplete rolling sums (first 12 months)', () => {
		// 24 months of data to get plenty of complete windows
		const values = Array(24).fill(1);
		const data = makeMonthlyData(2020, 24, { energy: values });

		const result = rollingSum12Mth(data, ['energy']);

		// First date is Jan 2020. firstAvailable = Jan 2021.
		// Only dates strictly after Jan 2021 are kept: Feb 2021 onwards.
		// That's indices 13–23 = 11 data points.
		expect(result).toHaveLength(11);

		// Each complete window sums 12 values of 1 = 12
		result.forEach((d) => {
			expect(d.energy).toBe(12);
		});
	});

	it('returns an empty array when data has exactly 12 months', () => {
		const values = Array(12).fill(10);
		const data = makeMonthlyData(2020, 12, { energy: values });

		const result = rollingSum12Mth(data, ['energy']);

		// firstAvailable = Jan 2021. No date in the 12-month dataset is after Jan 2021.
		expect(result).toHaveLength(0);
	});

	it('returns an empty array when data has fewer than 12 months', () => {
		const values = Array(6).fill(10);
		const data = makeMonthlyData(2020, 6, { energy: values });

		const result = rollingSum12Mth(data, ['energy']);

		expect(result).toHaveLength(0);
	});

	it('handles nulls in one key without affecting other keys', () => {
		const solarValues = Array(14).fill(10);
		const windValues = Array(14).fill(10);
		windValues[5] = null; // only wind has a null

		const data = makeMonthlyData(2020, 14, {
			solar: solarValues,
			wind: windValues
		});

		const result = rollingSum12Mth(data, ['solar', 'wind']);

		expect(result).toHaveLength(1);
		expect(result[0].solar).toBe(120); // unaffected
		expect(result[0].wind).toBeNull(); // null propagates
	});

	it('handles varying values across months', () => {
		// 14 months with values 1, 2, 3, ..., 14
		const values = Array.from({ length: 14 }, (_, i) => i + 1);
		const data = makeMonthlyData(2020, 14, { energy: values });

		const result = rollingSum12Mth(data, ['energy']);

		expect(result).toHaveLength(1);

		// Feb 2021 (index 13, value 14) window: dates after Feb 2020.
		// Includes indices 2–13 (values 3–14).
		// Sum = 3+4+5+6+7+8+9+10+11+12+13+14 = 102
		expect(result[0].energy).toBe(102);
	});

	it('does not mutate the original data', () => {
		const values = Array(14).fill(10);
		const data = makeMonthlyData(2020, 14, { energy: values });
		const originalValues = data.map((d) => d.energy);

		rollingSum12Mth(data, ['energy']);

		data.forEach((d, i) => {
			expect(d.energy).toBe(originalValues[i]);
		});
	});

	it('preserves non-key properties in output', () => {
		const data = makeMonthlyData(2020, 14, { energy: Array(14).fill(10) });
		data.forEach((d, i) => {
			d.region = 'NSW';
			d.index = i;
		});

		const result = rollingSum12Mth(data, ['energy']);

		result.forEach((d) => {
			expect(d.region).toBe('NSW');
			expect(d.index).toBeDefined();
		});
	});
});
