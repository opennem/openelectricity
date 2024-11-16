import { describe, expect, it } from 'vitest';
import mergeDataBetweenStatsType from '$lib/utils/Statistic/merge-stats-type';
const data = [
	{
		history: {
			start: '2024-07-17T09:30:00+10:00',
			last: '2024-07-24T09:00:00+10:00',
			interval: '30m',
			data: [1924, 736.2]
		},
		forecast: {
			start: '2024-07-24T09:30:00+10:00',
			last: '2024-07-24T21:00:00+10:00',
			interval: '30m',
			data: [5351, 6428]
		}
	}
];

describe('mergeStatsType', () => {
	it('Merges history data and forecast data', () => {
		let result = mergeDataBetweenStatsType(/** @type {StatsData[]} */ (data), 'history');
		expect(result[0].history.data).toStrictEqual([1924, 736.2, 5351, 6428]);
		expect(result[0].history.start).toBe('2024-07-17T09:30:00+10:00');
		expect(result[0].history.last).toBe('2024-07-24T21:00:00+10:00');
	});

	it('Does not merge data if statType is forecast', () => {
		let result = mergeDataBetweenStatsType(/** @type {StatsData[]} */ (data), 'forecast');
		expect(result[0].history.data).toStrictEqual([1924, 736.2]);
		expect(result[0].history.start).toBe('2024-07-17T09:30:00+10:00');
		expect(result[0].history.last).toBe('2024-07-24T09:00:00+10:00');
	});
});
