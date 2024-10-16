import { describe, it, expect } from 'vitest';
import Statistic from './index';
import { loadFuelTechs } from '$lib/fuel_techs';

describe('Statistic', () => {
	it('initializes with deep copied data', () => {
		const data = [
			{
				fuel_tech: 'solar_utility',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: /** @type {number[]} */ ([])
				}
			}
		];
		let statistic = new Statistic(/** @type {StatsData[]} */ (data), 'history', 'kWh');
		expect(statistic.originalData).toEqual(data);
		expect(statistic.data).toEqual(data);
		expect(statistic.data).not.toBe(statistic.originalData);
	});

	it('parses units', () => {
		let statistic = new Statistic([], 'history', 'kWh');
		expect(statistic.prefix).toBe('k');
		expect(statistic.baseUnit).toBe('Wh');
	});

	it('inverts values in target loads', () => {
		const data = [
			{
				fuel_tech: 'solar_utility',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: [1, 2, -2]
				}
			},
			{
				fuel_tech: 'battery_discharging',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: [1, 2, -2]
				}
			}
		];
		let statistic = new Statistic(/** @type {StatsData[]} */ (data), 'history', 'kWh').invertValues(
			['solar_utility']
		);
		expect(statistic.data[0].history.data).toEqual([-1, -2, 2]);
		expect(statistic.data[1].history.data).toEqual([1, 2, -2]);
	});

	it('adds total minus loads', () => {
		const data = [
			{
				fuel_tech: 'battery_charging',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: [10, 20, 30]
				}
			},
			{
				fuel_tech: 'wind',
				history: {
					start: '',
					last: '',
					interval: '1m',
					data: [1, 2, 3]
				}
			},
			{
				fuel_tech: 'solar_utility',
				history: {
					start: '',
					last: '',
					interval: '1m',
					data: [2, 4, 6]
				}
			}
		];
		let statistic = new Statistic(
			/** @type {StatsData[]} */ (data),
			'history',
			'kWh'
		).addTotalMinusLoads(loadFuelTechs);
		expect(statistic.data.length).toEqual(statistic.originalData.length + 1);
		expect(statistic.data[statistic.originalData.length].history.data).toEqual([3, 6, 9]);
	});

	it('merges and interpolates', () => {
		const data = [
			{
				fuel_tech: 'battery_charging',
				history: {
					start: '2024-07-17T09:35:00+00:00',
					last: '2024-07-17T09:36:00+00:00',
					interval: '1m',
					data: [10, 20]
				},
				forecast: {
					start: '2024-07-17T09:37:00+00:00',
					last: '2024-07-17T09:38:00+00:00',
					interval: '1m',
					data: [40, 50]
				}
			},
			{
				fuel_tech: 'wind',
				history: {
					start: '2024-07-17T09:25:00+00:00',
					last: '2024-07-17T09:35:00+00:00',
					interval: '5m',
					data: [5, 4, 3]
				},
				forecast: {
					start: '2024-07-17T12:35:00+00:00',
					last: '2024-07-17T12:45:00+00:00',
					interval: '10m',
					data: [1, 2, 3]
				}
			}
		];
		let statistic = new Statistic(
			/** @type {StatsData[]} */ (data),
			'history',
			'kWh'
		).mergeAndInterpolate();
		expect(statistic.data[0].forecast).toEqual(data[0].forecast);
		expect(statistic.data[0].history).not.toEqual(data[0].history);
		expect(statistic.data[0].history.data).toEqual([
			...data[0].history.data,
			...data[0].forecast.data
		]);
		expect(statistic.data[0].history.start).toEqual(data[0].history.start);
		expect(statistic.data[0].history.last).toEqual(data[0].forecast.last);
		expect(statistic.data[1].forecast).toEqual(data[1].forecast);
		expect(statistic.data[1].history).not.toEqual(data[1].history);
		// TODO: don't fully understand the intended behaviour here
		expect(statistic.data[1].history).toMatchInlineSnapshot(`
			{
			  "data": [
			    3,
			    2.6000000000000005,
			    2.1999999999999997,
			    1.8000000000000003,
			  ],
			  "interval": "1m",
			  "last": "2024-07-17T09:38:00+00:00",
			  "start": "2024-07-17T09:35:00+00:00",
			}
		`);
	});

	it('re-orders', () => {
		const data = [
			{
				fuel_tech: 'battery_distributed_discharging',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: [1, 2, -2]
				}
			},
			{
				fuel_tech: 'battery_discharging',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: [1, 3, -1]
				}
			}
		];
		let statistic = new Statistic(/** @type {StatsData[]} */ (data), 'history', 'kWh').reorder([
			'battery_discharging',
			'battery_distributed_discharging'
		]);
		expect(statistic.data.map((x) => x.fuel_tech)).toStrictEqual([
			'battery_discharging',
			'battery_distributed_discharging'
		]);
	});

	it('groups', () => {
		const data = [
			{
				fuel_tech: 'battery_distributed_discharging',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: [1, 2, -2]
				}
			},
			{
				fuel_tech: 'battery_discharging',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: [1, 3, -1]
				}
			},
			{
				fuel_tech: 'gas_ocgt',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: [2, 1, 3]
				}
			}
		];
		let statistic = new Statistic(/** @type {StatsData[]} */ (data), 'history', 'kWh').group(
			{
				battery_discharging: ['battery_discharging', 'battery_distributed_discharging'],
				gas_ocgt: ['gas_ocgt']
			},
			loadFuelTechs
		);
		expect(statistic.data.length).toEqual(data.length - 1);
		expect(statistic.data[0].history.data).toEqual([2, 5, -3]);
	});

	it('drops unexpected fuel_tech when grouping', () => {
		const data = [
			{
				fuel_tech: 'gas_ocgt',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: [2, 1, 3]
				}
			}
		];
		let statistic = new Statistic(/** @type {StatsData[]} */ (data), 'history', 'kWh').group(
			{ battery_discharging: ['battery_discharging'] },
			loadFuelTechs
		);
		expect(statistic.data.length).toEqual(0);
	});
});
