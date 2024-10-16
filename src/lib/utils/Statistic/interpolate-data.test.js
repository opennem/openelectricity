import { describe, expect, it } from 'vitest';
import interpolateData from '$lib/utils/Statistic/interpolate-data';
import parseInterval from '$lib/utils/intervals';

describe('Interpolate dataset', () => {
	it('returns interpolated data from 30 minutes interval to 5 minutes interval', () => {
		const minInterval = parseInterval('5m');
		const data = [
			// TODO: not sure why we require this to be here for interpolation to occur?
			{
				id: 'au.nem.fuel_tech.battery_charging.power',
				type: 'power',
				fuel_tech: 'battery_charging',
				code: 'battery_charging',
				network: 'nem',
				data_type: 'power',
				units: 'MW',
				history: {
					start: '2024-07-17T09:35:00+10:00',
					last: '2024-07-24T09:35:00+10:00',
					interval: '5m',
					data: /** @type {number[]} */ ([])
				}
			},
			{
				id: 'au.nem.fuel_tech.solar_rooftop.power',
				type: 'power',
				fuel_tech: 'solar_rooftop',
				code: 'solar_rooftop',
				network: 'nem',
				data_type: 'power',
				units: 'MW',
				history: {
					start: '2024-07-17T09:30:00+10:00',
					last: '2024-07-24T09:00:00+10:00',
					interval: '30m',
					data: [4796, 34.5, 0]
				},
				forecast: {
					start: '2024-07-24T09:30:00+10:00',
					last: '2024-07-24T21:00:00+10:00',
					interval: '30m',
					data: [5351, 6428, 7394]
				}
			}
		];
		const result = interpolateData(/** @type {StatsData[]} */ (data), minInterval, 'history');
		expect(result.length).toBe(data.length - 1);
		expect(result[0].id).toBe('au.nem.fuel_tech.solar_rooftop.power');
		expect(result[0].history.data).toMatchInlineSnapshot(`
			[
			  4002.416666666667,
			  3208.8333333333335,
			  2415.25,
			  1621.6666666666667,
			  828.0833333333331,
			  34.5,
			  28.75,
			  23.000000000000004,
			  17.25,
			  11.500000000000002,
			  5.749999999999999,
			  0,
			  891.8333333333333,
			  1783.6666666666665,
			  2675.5,
			  3567.333333333333,
			  4459.166666666667,
			  5351,
			  5530.5,
			  5710,
			  5889.5,
			  6069,
			  6248.5,
			  6428,
			  6589,
			  6750,
			  6911,
			  7072,
			  7233,
			  7394,
			]
		`);
	});
});
