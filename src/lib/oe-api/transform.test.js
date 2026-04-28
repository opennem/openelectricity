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

	it('does NOT divide by 1000 for market metrics that come back already in GWh', () => {
		// The OE API mislabels these metrics: the response says unit=MWh but the
		// actual values are GWh. Without this guard, the pipeline divides them by
		// 1000 a second time and the percentage downstream blows up.
		/** @type {import('openelectricity').INetworkTimeSeries} */
		const demand = {
			...mockEnergyTimeSeries,
			metric: /** @type {any} */ ('demand_gross_energy'),
			unit: 'MWh',
			results: [
				{
					name: 'demand_gross_energy_total',
					date_start: '2024-01-01T00:00:00+10:00',
					date_end: '2024-02-01T00:00:00+10:00',
					columns: {},
					data: [
						['2024-01-01T00:00:00+10:00', 16260.146],
						['2024-02-01T00:00:00+10:00', 15648.4243]
					]
				}
			]
		};

		const result = transformOeToStatsData(demand);
		expect(result[0].units).toBe('GWh');
		// values pass through unchanged (no /1000)
		expect(result[0].history.data).toEqual([16260.146, 15648.4243]);
	});

	it('does NOT divide by 1000 for generation_renewable_energy market metric', () => {
		/** @type {import('openelectricity').INetworkTimeSeries} */
		const renewable = {
			...mockEnergyTimeSeries,
			metric: /** @type {any} */ ('generation_renewable_energy'),
			unit: 'MWh',
			results: [
				{
					name: 'generation_renewable_energy_total',
					date_start: '2024-01-01T00:00:00+10:00',
					date_end: '2024-01-01T00:00:00+10:00',
					columns: {},
					data: [['2024-01-01T00:00:00+10:00', 4868.8033]]
				}
			]
		};

		const result = transformOeToStatsData(renewable);
		expect(result[0].units).toBe('GWh');
		expect(result[0].history.data).toEqual([4868.8033]);
	});

	it('still divides fueltech energy (genuine MWh) by 1000', () => {
		// Sanity check: the fueltech energy endpoint really does return MWh.
		// 7.9M MWh = 7.9k GWh = 7.9 TWh — realistic for monthly black coal.
		const result = transformOeToStatsData(mockEnergyTimeSeries);
		expect(result[0].history.data).toEqual([50, 48, 46]);
		expect(result[0].units).toBe('GWh');
	});

	it('handles secondary_grouping=renewable response with boolean discriminator', () => {
		/** @type {import('openelectricity').INetworkTimeSeries} */
		const renewableGrouping = {
			...mockEnergyTimeSeries,
			groupings: /** @type {any} */ (['network', 'renewable']),
			results: [
				{
					name: 'energy_True',
					date_start: '2024-01-01T00:00:00+10:00',
					date_end: '2024-02-01T00:00:00+10:00',
					columns: /** @type {any} */ ({ renewable: true }),
					data: [['2024-01-01T00:00:00+10:00', 7364181]]
				},
				{
					name: 'energy_False',
					date_start: '2024-01-01T00:00:00+10:00',
					date_end: '2024-02-01T00:00:00+10:00',
					columns: /** @type {any} */ ({ renewable: false }),
					data: [['2024-01-01T00:00:00+10:00', 11539408]]
				}
			]
		};

		const result = transformOeToStatsData(renewableGrouping);

		expect(result[0].fuel_tech).toBe('renewable_aggregate');
		expect(result[0].data_type).toBe('generation_renewable_aggregate');
		expect(result[0].id).toBe('au.fuel_tech.renewable_aggregate.generation_renewable_aggregate');
		// MWh → GWh divisor still applied (data endpoint values are real MWh)
		expect(result[0].history.data).toEqual([7364.181]);

		expect(result[1].fuel_tech).toBe('non_renewable_aggregate');
		expect(result[1].data_type).toBe('generation_non_renewable_aggregate');
		expect(result[1].history.data).toEqual([11539.408]);
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
