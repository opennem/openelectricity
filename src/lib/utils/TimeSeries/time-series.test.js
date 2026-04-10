import { describe, it, expect } from 'vitest';
import { startOfMonth } from 'date-fns';
import transform from './transform-stats-to-ts.js';

/**
 * Helper to create a StatsData-shaped object for testing.
 * @param {string} id
 * @param {string} start
 * @param {string} last
 * @param {number[]} data
 */
function makeStats(id, start, last, data) {
	return {
		id,
		fuel_tech: null,
		type: 'energy',
		units: 'GWh',
		label: id,
		colour: '#999',
		history: { start, last, interval: '1M', data }
	};
}

describe('transform-stats-to-ts (date-aligned mapping)', () => {
	it('maps a single dataset correctly', () => {
		const dataset = [makeStats('nsw', '2020-01-01', '2020-03-01', [100, 200, 300])];
		const result = transform(dataset, '1M', 'history');

		expect(result).toHaveLength(3);
		expect(result[0].nsw).toBe(100);
		expect(result[1].nsw).toBe(200);
		expect(result[2].nsw).toBe(300);
	});

	it('aligns datasets with different start dates to correct bucket positions', () => {
		const dataset = [
			makeStats('nsw', '2020-01-01', '2020-05-01', [10, 20, 30, 40, 50]),
			makeStats('tas', '2020-03-01', '2020-05-01', [300, 400, 500])
		];
		const result = transform(dataset, '1M', 'history');

		// Bucket should span Jan-May 2020 (5 entries)
		expect(result).toHaveLength(5);

		// NSW fills all positions
		expect(result[0].nsw).toBe(10);
		expect(result[1].nsw).toBe(20);
		expect(result[2].nsw).toBe(30);
		expect(result[3].nsw).toBe(40);
		expect(result[4].nsw).toBe(50);

		// TAS starts at March (index 2), earlier positions are undefined
		expect(result[0].tas).toBeUndefined();
		expect(result[1].tas).toBeUndefined();
		expect(result[2].tas).toBe(300);
		expect(result[3].tas).toBe(400);
		expect(result[4].tas).toBe(500);
	});

	it('aligns datasets with different last dates', () => {
		const dataset = [
			makeStats('nsw', '2020-01-01', '2020-05-01', [10, 20, 30, 40, 50]),
			makeStats('sa', '2020-01-01', '2020-03-01', [100, 200, 300])
		];
		const result = transform(dataset, '1M', 'history');

		// Bucket should span Jan-May 2020 (5 entries)
		expect(result).toHaveLength(5);

		// SA only has 3 values, rest should be undefined
		expect(result[0].sa).toBe(100);
		expect(result[1].sa).toBe(200);
		expect(result[2].sa).toBe(300);
		expect(result[3].sa).toBeUndefined();
		expect(result[4].sa).toBeUndefined();
	});

	it('handles datasets with both different start AND last dates', () => {
		const dataset = [
			makeStats('nsw', '2020-01-01', '2020-06-01', [1, 2, 3, 4, 5, 6]),
			makeStats('tas', '2020-03-01', '2020-04-01', [30, 40])
		];
		const result = transform(dataset, '1M', 'history');

		// Bucket spans Jan-Jun 2020 (6 entries)
		expect(result).toHaveLength(6);

		// TAS at indices 2-3 only
		expect(result[0].tas).toBeUndefined();
		expect(result[1].tas).toBeUndefined();
		expect(result[2].tas).toBe(30);
		expect(result[3].tas).toBe(40);
		expect(result[4].tas).toBeUndefined();
		expect(result[5].tas).toBeUndefined();
	});

	it('handles datasets where all have the same date range', () => {
		const dataset = [
			makeStats('nsw', '2020-01-01', '2020-03-01', [10, 20, 30]),
			makeStats('vic', '2020-01-01', '2020-03-01', [40, 50, 60])
		];
		const result = transform(dataset, '1M', 'history');

		expect(result).toHaveLength(3);
		expect(result[0].nsw).toBe(10);
		expect(result[0].vic).toBe(40);
		expect(result[2].nsw).toBe(30);
		expect(result[2].vic).toBe(60);
	});

	it('returns correct dates on each bucket entry', () => {
		const dataset = [makeStats('nsw', '2020-01-01', '2020-03-01', [10, 20, 30])];
		const result = transform(dataset, '1M', 'history');

		expect(result[0].date).toEqual(startOfMonth(new Date('2020-01-01')));
		expect(result[1].date).toEqual(startOfMonth(new Date('2020-02-01')));
		expect(result[2].date).toEqual(startOfMonth(new Date('2020-03-01')));
	});

	it('returns empty array for empty dataset', () => {
		const result = transform([], '1M', 'history');
		expect(result).toEqual([]);
	});

	it('returns empty array when dataset has no valid stats', () => {
		const dataset = [{ id: 'nsw', history: null }];
		const result = transform(dataset, '1M', 'history');
		expect(result).toEqual([]);
	});
});
