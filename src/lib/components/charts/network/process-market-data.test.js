import { describe, expect, it } from 'vitest';
import { processMarketData } from './process-market-data.js';

const TZ = '+10:00';

/**
 * Build an API response entry for one metric with [timestamp, value] pairs.
 * @param {string} metric
 * @param {[string, number][]} data
 */
const metricEntry = (metric, data) => ({
	metric,
	results: [{ name: metric, data }]
});

describe('processMarketData', () => {
	it('merges several metrics into one row set with per-def ids and colours', () => {
		const response = {
			data: [
				metricEntry('curtailment_solar_utility', [
					['2026-07-24T12:00:00', 120],
					['2026-07-24T12:05:00', 150]
				]),
				metricEntry('curtailment_wind', [['2026-07-24T12:00:00', 40]])
			]
		};

		const result = processMarketData(response, {
			networkTimezone: TZ,
			seriesDefs: [
				{
					metric: 'curtailment_solar_utility',
					id: 'curtailment_solar',
					label: 'Solar curtailment',
					colour: '#aaa'
				},
				{
					metric: 'curtailment_wind',
					id: 'curtailment_wind',
					label: 'Wind curtailment',
					colour: '#bbb'
				}
			]
		});

		expect(result?.seriesNames).toEqual(['curtailment_solar', 'curtailment_wind']);
		expect(result?.seriesColours).toEqual({ curtailment_solar: '#aaa', curtailment_wind: '#bbb' });
		expect(result?.data).toHaveLength(2);
		// Union rows: wind has no 12:05 sample → null
		expect(result?.data[0].curtailment_solar).toBe(120);
		expect(result?.data[0].curtailment_wind).toBe(40);
		expect(result?.data[1].curtailment_solar).toBe(150);
		expect(result?.data[1].curtailment_wind).toBeNull();
	});

	it('inverts series marked invert (diverging flows)', () => {
		const response = {
			data: [
				metricEntry('flow_imports', [['2026-07-24T12:00:00', 300]]),
				metricEntry('flow_exports', [['2026-07-24T12:00:00', 180]])
			]
		};

		const result = processMarketData(response, {
			networkTimezone: TZ,
			seriesDefs: [
				{ metric: 'flow_imports', id: 'imports', label: 'Imports', colour: '#521986' },
				{ metric: 'flow_exports', id: 'exports', label: 'Exports', colour: '#927BAD', invert: true }
			]
		});

		expect(result?.data[0].imports).toBe(300);
		expect(result?.data[0].exports).toBe(-180);
	});

	it('drops defs whose metric is absent and returns null when nothing matches', () => {
		const response = { data: [metricEntry('demand', [['2026-07-24T12:00:00', 8000]])] };

		const partial = processMarketData(response, {
			networkTimezone: TZ,
			seriesDefs: [
				{ metric: 'demand', id: 'demand', label: 'Demand', colour: '#353535' },
				{ metric: 'flow_imports', id: 'imports', label: 'Imports', colour: '#521986' }
			]
		});
		expect(partial?.seriesNames).toEqual(['demand']);

		const empty = processMarketData(response, {
			networkTimezone: TZ,
			seriesDefs: [{ metric: 'price', id: 'price', label: 'Price', colour: '#e63946' }]
		});
		expect(empty).toBeNull();
	});

	it('applies the network timezone to naive timestamps', () => {
		const response = { data: [metricEntry('demand', [['2026-07-24T12:00:00', 8000]])] };
		const result = processMarketData(response, {
			networkTimezone: TZ,
			seriesDefs: [{ metric: 'demand', id: 'demand', label: 'Demand', colour: '#353535' }]
		});
		expect(result?.data[0].time).toBe(new Date('2026-07-24T12:00:00+10:00').getTime());
	});
});
