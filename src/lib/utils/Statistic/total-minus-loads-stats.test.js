import { describe, expect, it } from 'vitest';
import totalMinusLoadsStats from '$lib/utils/Statistic/total-minus-loads-stats';
import { loadFuelTechs } from '$lib/fuel_techs';
/** @type {number[]} */
const emptyNumberArray = [];

describe('totalMinusLoadsStats', () => {
	it('returns default stats when no stats data is provided', () => {
		const result = totalMinusLoadsStats([], 'forecast', []);
		expect(result).toMatchInlineSnapshot(`
      {
        "data_type": "energy",
        "history": {
          "data": [],
          "interval": "1M",
          "last": "",
          "start": "",
        },
        "id": "au.total-minus-loads.history",
        "network": "nem",
        "type": "energy",
        "units": "GWh",
      }
    `);
	});

	it('returns stats with provided id', () => {
		const customId = 'custom-id';
		const result = totalMinusLoadsStats([], 'history', [], customId);
		expect(result.id).toBe(customId);
	});

	it('returns stats when no data inside stats', () => {
		const data = [
			{
				fuel_tech: 'solar_utility',
				history: {
					start: '2021-01-01T00:00:00Z',
					last: '2021-01-01T00:00:00Z',
					interval: '5m',
					data: emptyNumberArray
				}
			}
		];
		const result = totalMinusLoadsStats(/** @type {StatsData[]} */ (data), 'history', []);
		expect(result.history.interval).not.toEqual(data[0].history?.interval);
		expect(result.history.start).toEqual(data[0].history?.start);
		expect(result.history.last).toEqual(data[0].history?.last);
	});

	it('throws exception for non-history stats types', () => {
		const data = [
			{
				fuel_tech: 'solar_utility',
				forecast: {
					start: '2021-01-01T00:00:00Z',
					last: '2021-01-01T00:00:00Z',
					interval: '5m',
					data: emptyNumberArray
				}
			}
		];
		expect(() => {
			totalMinusLoadsStats(/** @type {StatsData[]} */ (data), 'forecast', []);
		}).toThrow("Cannot set properties of undefined (setting 'data')");
	});

	it('returns stats when one entry', () => {
		const data = [
			{
				fuel_tech: 'solar_utility',
				history: {
					start: '2021-01-01T00:00:00Z',
					last: '2021-01-01T00:00:00Z',
					interval: '5m',
					data: [10, 20, 30]
				}
			}
		];
		const result = totalMinusLoadsStats(/** @type {StatsData[]} */ (data), 'history', []);
		expect(result.history.start).toEqual(data[0].history?.start);
		expect(result.history.last).toEqual(data[0].history?.last);
		expect(result.history.data).toStrictEqual(data[0].history?.data);
	});

	it('returns aggregated stats', () => {
		const data = [
			{
				fuel_tech: 'solar_utility',
				history: {
					start: '2021-01-01T00:00:00Z',
					last: '2021-01-01T00:00:00Z',
					interval: '5m',
					data: [10, 20, 30]
				}
			},
			{
				fuel_tech: 'solar_utility',
				history: {
					start: '2021-01-01T00:00:00Z',
					last: '2021-01-01T00:00:00Z',
					interval: '1m',
					data: [2, 4, 6]
				}
			},
			{
				fuel_tech: 'wind',
				history: {
					start: '2021-01-01T00:00:00Z',
					last: '2021-01-01T00:00:00Z',
					interval: '1m',
					data: [1, 2, 3]
				}
			}
		];
		const result = totalMinusLoadsStats(/** @type {StatsData[]} */ (data), 'history', []);
		expect(result.history.data).toStrictEqual([13, 26, 39]);
	});

	it('excludes loads from stats aggregation when passed fuel_techs', () => {
		const data = [
			{
				fuel_tech: 'battery_charging',
				history: {
					start: '2021-01-01T00:00:00Z',
					last: '2021-01-01T00:00:00Z',
					interval: '5m',
					data: [10, 20, 30]
				}
			},
			{
				fuel_tech: 'solar_utility',
				history: {
					start: '2021-01-01T00:00:00Z',
					last: '2021-01-01T00:00:00Z',
					interval: '1m',
					data: [2, 4, 6]
				}
			}
		];
		const result = totalMinusLoadsStats(
			/** @type {StatsData[]} */ (data),
			'history',
			loadFuelTechs
		);
		expect(result.history.data).toStrictEqual([2, 4, 6]);
	});
});
