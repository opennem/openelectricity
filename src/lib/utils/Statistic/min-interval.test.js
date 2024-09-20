import { describe, expect, it } from 'vitest';
import getMinInterval from '$lib/utils/Statistic/min-interval';
/** @type {number[]} */
const emptyNumberArray = [];

describe('minInterval', () => {
	it('returns the smallest interval without provided StatType (default to history)', () => {
		const data = [
			{
				fuel_tech: 'solar_utility',
				history: {
					start: '',
					last: '',
					interval: '5m',
					data: emptyNumberArray
				}
			},
			{
				fuel_tech: 'solar_utility',
				history: {
					start: '',
					last: '',
					interval: '10s',
					data: emptyNumberArray
				}
			}
		];
		expect(getMinInterval(/** @type {StatsData[]} */ (data))?.intervalString).toBe('10s');
	});

	it('returns the smallest interval between forecasts', () => {
		const data = [
			{
				fuel_tech: 'solar_utility',
				forecast: {
					start: '',
					last: '',
					interval: '5M',
					data: emptyNumberArray
				}
			},
			{
				fuel_tech: 'solar_utility',
				forecast: {
					start: '',
					last: '',
					interval: '5h',
					data: emptyNumberArray
				}
			}
		];

		expect(getMinInterval(/** @type {StatsData[]} */ (data), 'forecast')?.intervalString).toBe(
			'5h'
		);
	});
});
