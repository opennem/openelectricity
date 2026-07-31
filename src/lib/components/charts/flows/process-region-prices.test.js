import { describe, expect, it } from 'vitest';
import { processRegionPrices } from './process-region-prices.js';

const T1 = '2026-07-24T14:20:00+10:00';
const T2 = '2026-07-24T14:25:00+10:00';

const priceResponse = {
	data: [
		{
			metric: 'price',
			results: [
				{
					name: 'price_VIC1',
					columns: { region: 'VIC1' },
					data: [
						[T1, 87.4],
						[T2, 92.1]
					]
				},
				{
					name: 'price_NSW1',
					columns: { region: 'NSW1' },
					data: [[T1, 104.5]]
				}
			]
		}
	]
};

describe('processRegionPrices', () => {
	it('emits one series per region in canonical order with union rows', () => {
		const result = processRegionPrices(priceResponse);

		expect(result).not.toBeNull();
		expect(result?.seriesNames).toEqual(['NSW1', 'VIC1']);
		expect(result?.data).toHaveLength(2);
		expect(result?.data[0].NSW1).toBe(104.5);
		expect(result?.data[0].VIC1).toBe(87.4);
		// NSW1 missing the second timestamp → null, not index-shifted
		expect(result?.data[1].NSW1).toBeNull();
		expect(result?.data[1].VIC1).toBe(92.1);
	});

	it('colours and labels regions from the shared registry', () => {
		const result = processRegionPrices(priceResponse);
		expect(result?.seriesColours.NSW1).toBe('#A078D7');
		expect(result?.seriesLabels.NSW1).toBe('NSW');
	});

	it('accepts network_region as the region column', () => {
		const response = {
			data: [
				{
					metric: 'price',
					results: [{ name: 'price', columns: { network_region: 'SA1' }, data: [[T1, -12.3]] }]
				}
			]
		};
		const result = processRegionPrices(response);
		expect(result?.seriesNames).toEqual(['SA1']);
		expect(result?.data[0].SA1).toBe(-12.3);
	});

	it('returns null when no price series are present', () => {
		expect(processRegionPrices({ data: [] })).toBeNull();
	});
});
