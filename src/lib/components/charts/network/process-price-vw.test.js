import { describe, it, expect } from 'vitest';
import { processPriceVw, deriveVwPriceDisplayRows } from './process-price-vw.js';

/**
 * @param {string} metric
 * @param {Array<{ fueltech: string, values: Array<[string, number | null]> }>} seriesDefs
 */
function metricEntry(metric, seriesDefs) {
	return {
		metric,
		results: seriesDefs.map(({ fueltech, values }) => ({
			name: `${metric}_NSW1|${fueltech}`,
			columns: { fueltech },
			data: values
		}))
	};
}

const T0 = '2026-07-01T00:00:00+10:00';
const T1 = '2026-08-01T00:00:00+10:00';

describe('processPriceVw', () => {
	it('emits summed market-value and energy component series', () => {
		const response = {
			data: [
				metricEntry('market_value', [
					{
						fueltech: 'coal_black',
						values: [
							[T0, 500000],
							[T1, 600000]
						]
					},
					{
						fueltech: 'wind',
						values: [
							[T0, 100000],
							[T1, 90000]
						]
					}
				]),
				metricEntry('energy', [
					{
						fueltech: 'coal_black',
						values: [
							[T0, 5000],
							[T1, 5500]
						]
					},
					{
						fueltech: 'wind',
						values: [
							[T0, 2000],
							[T1, 1500]
						]
					}
				])
			]
		};

		const result = processPriceVw(response, { intervalHours: 730 });
		expect(result).not.toBeNull();
		expect(result?.seriesNames).toEqual(['market_value', 'energy_mwh']);
		expect(result?.data).toHaveLength(2);
		expect(result?.data[0].market_value).toBe(600000);
		expect(result?.data[0].energy_mwh).toBe(7000);
	});

	it('converts a power basis to MWh via intervalHours', () => {
		const response = {
			data: [
				metricEntry('market_value', [{ fueltech: 'coal_black', values: [[T0, 1000]] }]),
				metricEntry('power', [{ fueltech: 'coal_black', values: [[T0, 1200]] }])
			]
		};
		const result = processPriceVw(response, { intervalHours: 0.5 });
		expect(result?.data[0].energy_mwh).toBe(600);
	});

	it('excludes the aggregate battery series from both sides', () => {
		const response = {
			data: [
				metricEntry('market_value', [
					{ fueltech: 'coal_black', values: [[T0, 100]] },
					{ fueltech: 'battery', values: [[T0, 999]] }
				]),
				metricEntry('energy', [
					{ fueltech: 'coal_black', values: [[T0, 1200]] },
					{ fueltech: 'battery', values: [[T0, 9999]] }
				])
			]
		};
		const result = processPriceVw(response, { intervalHours: 730 });
		expect(result?.data[0].market_value).toBe(100);
		expect(result?.data[0].energy_mwh).toBe(1200);
	});

	it('returns null when either component is missing', () => {
		const mvOnly = {
			data: [metricEntry('market_value', [{ fueltech: 'coal_black', values: [[T0, 1]] }])]
		};
		expect(processPriceVw(mvOnly, { intervalHours: 1 })).toBeNull();
		expect(processPriceVw({ data: [] }, { intervalHours: 1 })).toBeNull();
	});
});

describe('deriveVwPriceDisplayRows', () => {
	it('computes $/MWh as a ratio of sums', () => {
		const rows = [{ date: new Date(0), time: 0, market_value: 700000, energy_mwh: 7000 }];
		expect(deriveVwPriceDisplayRows(rows)[0].vw_price).toBeCloseTo(100, 6);
	});

	it('nulls buckets without positive energy or missing market value', () => {
		const rows = [
			{ date: new Date(0), time: 0, market_value: 10, energy_mwh: 0 },
			{ date: new Date(1), time: 1, market_value: null, energy_mwh: 500 }
		];
		const derived = deriveVwPriceDisplayRows(rows);
		expect(derived[0].vw_price).toBeNull();
		expect(derived[1].vw_price).toBeNull();
	});
});
