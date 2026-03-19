import { describe, it, expect } from 'vitest';
import { transformOeToStatsData } from './transform.js';

/** @type {import('openelectricity').INetworkTimeSeries} */
const mockEnergyTimeSeries = {
	network_code: 'NEM',
	metric: 'energy',
	unit: 'MWh',
	interval: '1M',
	start: '2009-07-01T00:00:00+10:00',
	end: '2024-07-01T00:00:00+10:00',
	groupings: ['fueltech'],
	results: [
		{
			name: 'coal_black',
			date_start: '2009-07-01T00:00:00+10:00',
			date_end: '2024-07-01T00:00:00+10:00',
			columns: { fueltech: 'coal_black' },
			data: [
				['2009-07-01T00:00:00+10:00', 50000],
				['2010-07-01T00:00:00+10:00', 48000],
				['2011-07-01T00:00:00+10:00', 46000]
			]
		},
		{
			name: 'solar_utility',
			date_start: '2009-07-01T00:00:00+10:00',
			date_end: '2024-07-01T00:00:00+10:00',
			columns: { fueltech: 'solar_utility' },
			data: [
				['2009-07-01T00:00:00+10:00', 100],
				['2010-07-01T00:00:00+10:00', 200],
				['2011-07-01T00:00:00+10:00', 500]
			]
		}
	],
	network_timezone_offset: '+10:00'
};

describe('transformOeToStatsData', () => {
	it('transforms OE API response into StatsData array', () => {
		const result = transformOeToStatsData(mockEnergyTimeSeries);

		expect(result).toHaveLength(2);
	});

	it('maps fuel_tech from columns', () => {
		const result = transformOeToStatsData(mockEnergyTimeSeries);

		expect(result[0].fuel_tech).toBe('coal_black');
		expect(result[1].fuel_tech).toBe('solar_utility');
	});

	it('sets correct id format', () => {
		const result = transformOeToStatsData(mockEnergyTimeSeries);

		expect(result[0].id).toBe('au.fuel_tech.coal_black.energy');
		expect(result[1].id).toBe('au.fuel_tech.solar_utility.energy');
	});

	it('sets metadata from parent time series', () => {
		const result = transformOeToStatsData(mockEnergyTimeSeries);

		expect(result[0].type).toBe('energy');
		expect(result[0].data_type).toBe('energy');
		expect(result[0].units).toBe('GWh');
		expect(result[0].network).toBe('NEM');
	});

	it('converts MWh values to GWh (divide by 1000)', () => {
		const result = transformOeToStatsData(mockEnergyTimeSeries);

		expect(result[0].history.data).toEqual([50, 48, 46]);
		expect(result[1].history.data).toEqual([0.1, 0.2, 0.5]);
	});

	it('sets history start/last from first/last data points', () => {
		const result = transformOeToStatsData(mockEnergyTimeSeries);

		expect(result[0].history.start).toBe('2009-07-01T00:00:00+10:00');
		expect(result[0].history.last).toBe('2011-07-01T00:00:00+10:00');
	});

	it('sets history interval from source time series', () => {
		const result = transformOeToStatsData(mockEnergyTimeSeries);

		expect(result[0].history.interval).toBe('1M');
	});

	it('handles empty results array', () => {
		const empty = { ...mockEnergyTimeSeries, results: [] };
		const result = transformOeToStatsData(empty);

		expect(result).toEqual([]);
	});

	it('handles result with empty data array', () => {
		const emptyData = {
			...mockEnergyTimeSeries,
			results: [
				{
					name: 'wind',
					date_start: '',
					date_end: '',
					columns: { fueltech: 'wind' },
					data: /** @type {[string, number | null][]} */ ([])
				}
			]
		};
		const result = transformOeToStatsData(emptyData);

		expect(result).toHaveLength(1);
		expect(result[0].history.data).toEqual([]);
		expect(result[0].history.start).toBe('');
		expect(result[0].history.last).toBe('');
	});

	it('works for emissions metric and converts unit label to tCO2e', () => {
		/** @type {import('openelectricity').INetworkTimeSeries} */
		const emissionsTs = {
			...mockEnergyTimeSeries,
			metric: 'emissions',
			unit: 't',
			results: [
				{
					name: 'coal_black',
					date_start: '2009-07-01T00:00:00+10:00',
					date_end: '2011-07-01T00:00:00+10:00',
					columns: { fueltech: 'coal_black' },
					data: [
						['2009-07-01T00:00:00+10:00', 40000],
						['2010-07-01T00:00:00+10:00', 38000]
					]
				}
			]
		};

		const result = transformOeToStatsData(emissionsTs);

		expect(result[0].id).toBe('au.fuel_tech.coal_black.emissions');
		expect(result[0].data_type).toBe('emissions');
		expect(result[0].units).toBe('tCO2e');
	});
});
