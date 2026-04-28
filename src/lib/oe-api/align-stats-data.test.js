import { describe, it, expect } from 'vitest';
import { alignStatsDataToCommonRange } from './align-stats-data.js';

/**
 * @param {string} fuelTech
 * @param {string} start
 * @param {string} last
 * @param {Array<number | null>} data
 * @returns {StatsData}
 */
function makeStats(fuelTech, start, last, data) {
	return /** @type {StatsData} */ ({
		id: `au.fuel_tech.${fuelTech}.energy`,
		type: 'energy',
		fuel_tech: /** @type {FuelTechCode} */ (fuelTech),
		data_type: 'energy',
		units: 'GWh',
		network: 'NEM',
		history: { start, last, interval: '1M', data }
	});
}

describe('alignStatsDataToCommonRange', () => {
	it('returns [] for empty input', () => {
		expect(alignStatsDataToCommonRange([])).toEqual([]);
		// @ts-expect-error testing nullish input
		expect(alignStatsDataToCommonRange(null)).toEqual([]);
	});

	it('returns a single series unchanged in shape', () => {
		const input = [
			makeStats(
				'coal_black',
				'2010-01-01T00:00:00+10:00',
				'2010-04-01T00:00:00+10:00',
				[1, 2, 3, 4]
			)
		];
		const result = alignStatsDataToCommonRange(input);
		expect(result).toHaveLength(1);
		expect(result[0].history.data).toEqual([1, 2, 3, 4]);
		expect(result[0].history.start).toBe('2010-01-01T00:00:00+10:00');
		expect(result[0].history.last).toBe('2010-04-01T00:00:00+10:00');
	});

	it('front-pads a series that starts later than the reference', () => {
		const input = [
			makeStats(
				'coal_black',
				'2010-01-01T00:00:00+10:00',
				'2010-06-01T00:00:00+10:00',
				[1, 2, 3, 4, 5, 6]
			),
			makeStats(
				'solar_utility',
				'2010-04-01T00:00:00+10:00',
				'2010-06-01T00:00:00+10:00',
				[10, 20, 30]
			)
		];
		const result = alignStatsDataToCommonRange(input);
		expect(result[1].history.data).toEqual([null, null, null, 10, 20, 30]);
		expect(result[1].history.start).toBe('2010-01-01T00:00:00+10:00');
		expect(result[1].history.last).toBe('2010-06-01T00:00:00+10:00');
	});

	it('back-pads a series that ends earlier than the reference', () => {
		const input = [
			makeStats(
				'coal_black',
				'2010-01-01T00:00:00+10:00',
				'2010-06-01T00:00:00+10:00',
				[1, 2, 3, 4, 5, 6]
			),
			makeStats('wind', '2010-01-01T00:00:00+10:00', '2010-04-01T00:00:00+10:00', [10, 20, 30, 40])
		];
		const result = alignStatsDataToCommonRange(input);
		expect(result[1].history.data).toEqual([10, 20, 30, 40, null, null]);
		expect(result[1].history.start).toBe('2010-01-01T00:00:00+10:00');
		expect(result[1].history.last).toBe('2010-06-01T00:00:00+10:00');
	});

	it('uses the widest span across multiple series as default reference', () => {
		// coal_black is short, hydro spans the widest range; the result range
		// should match hydro's start and end.
		const input = [
			makeStats('coal_black', '2010-03-01T00:00:00+10:00', '2010-04-01T00:00:00+10:00', [50, 60]),
			makeStats(
				'hydro',
				'2010-01-01T00:00:00+10:00',
				'2010-06-01T00:00:00+10:00',
				[1, 2, 3, 4, 5, 6]
			),
			makeStats(
				'solar_utility',
				'2010-02-01T00:00:00+10:00',
				'2010-05-01T00:00:00+10:00',
				[10, 20, 30, 40]
			)
		];
		const result = alignStatsDataToCommonRange(input);
		// coal_black: 2 months later start, 2 months earlier end → padded both sides
		expect(result[0].history.data).toEqual([null, null, 50, 60, null, null]);
		// hydro: reference, unchanged
		expect(result[1].history.data).toEqual([1, 2, 3, 4, 5, 6]);
		// solar_utility: 1 month later start, 1 month earlier end
		expect(result[2].history.data).toEqual([null, 10, 20, 30, 40, null]);
		// All aligned to hydro's range
		for (const r of result) {
			expect(r.history.start).toBe('2010-01-01T00:00:00+10:00');
			expect(r.history.last).toBe('2010-06-01T00:00:00+10:00');
		}
	});

	it('honours referenceFuelTech override', () => {
		// hydro is widest, but caller overrides reference to coal_black (narrowest).
		// Other series should be truncated/padded relative to coal_black's range.
		const input = [
			makeStats('coal_black', '2010-03-01T00:00:00+10:00', '2010-04-01T00:00:00+10:00', [50, 60]),
			makeStats(
				'hydro',
				'2010-01-01T00:00:00+10:00',
				'2010-06-01T00:00:00+10:00',
				[1, 2, 3, 4, 5, 6]
			)
		];
		const result = alignStatsDataToCommonRange(input, { referenceFuelTech: 'coal_black' });
		// coal_black is reference → unchanged
		expect(result[0].history.data).toEqual([50, 60]);
		// hydro starts 2 months earlier, ends 2 months later than reference.
		// The util only pads (it does not truncate), so when the source is wider
		// than the reference, the data length will exceed the reference length.
		// This is acceptable because the only callers of this util feed the
		// result into Statistic, which uses data[0].length as the canonical length —
		// so the reference must be the longest series in practice.
		// We assert the data length here so anyone changing this behaviour notices.
		expect(result[1].history.data).toEqual([1, 2, 3, 4, 5, 6]);
		expect(result[1].history.start).toBe('2010-01-01T00:00:00+10:00');
		expect(result[1].history.last).toBe('2010-06-01T00:00:00+10:00');
	});

	it('does not mutate input arrays', () => {
		const inputData = [10, 20, 30];
		const input = [
			makeStats(
				'coal_black',
				'2010-01-01T00:00:00+10:00',
				'2010-06-01T00:00:00+10:00',
				[1, 2, 3, 4, 5, 6]
			),
			makeStats(
				'solar_utility',
				'2010-04-01T00:00:00+10:00',
				'2010-06-01T00:00:00+10:00',
				inputData
			)
		];
		const result = alignStatsDataToCommonRange(input);

		expect(inputData).toEqual([10, 20, 30]);
		expect(input[1].history.data).toBe(inputData);
		expect(input[1].history.start).toBe('2010-04-01T00:00:00+10:00');
		expect(result[1].history.data).not.toBe(inputData);
	});

	it('passes empty series through unchanged', () => {
		const input = [
			makeStats(
				'coal_black',
				'2010-01-01T00:00:00+10:00',
				'2010-06-01T00:00:00+10:00',
				[1, 2, 3, 4, 5, 6]
			),
			makeStats('wind', '', '', [])
		];
		const result = alignStatsDataToCommonRange(input);
		expect(result[1].history.data).toEqual([]);
		expect(result[1].history.start).toBe('');
	});

	it('honours fallbackStart / fallbackLast when wider than the data range', () => {
		const input = [
			makeStats('coal_black', '2010-03-01T00:00:00+10:00', '2010-04-01T00:00:00+10:00', [1, 2])
		];
		const result = alignStatsDataToCommonRange(input, {
			fallbackStart: '2010-01-01T00:00:00+10:00',
			fallbackLast: '2010-06-01T00:00:00+10:00'
		});
		expect(result[0].history.data).toEqual([null, null, 1, 2, null, null]);
		expect(result[0].history.start).toBe('2010-01-01T00:00:00+10:00');
		expect(result[0].history.last).toBe('2010-06-01T00:00:00+10:00');
	});
});
