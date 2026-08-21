import { describe, it, expect } from 'vitest';
import {
	processEmissionsIntensity,
	deriveIntensityDisplayRows
} from './process-emissions-intensity.js';

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

const T0 = '2026-08-05T12:00:00+10:00';
const T1 = '2026-08-05T12:05:00+10:00';

describe('processEmissionsIntensity', () => {
	it('emits summed component series with a power basis converted to MWh', () => {
		const response = {
			data: [
				metricEntry('emissions', [
					{
						fueltech: 'coal_black',
						values: [
							[T0, 60],
							[T1, 66]
						]
					},
					{
						fueltech: 'gas_ccgt',
						values: [
							[T0, 12],
							[T1, 6]
						]
					},
					{
						fueltech: 'wind',
						values: [
							[T0, 0],
							[T1, 0]
						]
					}
				]),
				metricEntry('power', [
					{
						fueltech: 'coal_black',
						values: [
							[T0, 6000],
							[T1, 6600]
						]
					},
					{
						fueltech: 'wind',
						values: [
							[T0, 1200],
							[T1, 1200]
						]
					}
				])
			]
		};

		const result = processEmissionsIntensity(response, { intervalHours: 5 / 60 });
		expect(result).not.toBeNull();
		expect(result?.seriesNames).toEqual(['emissions', 'energy_mwh']);
		expect(result?.data).toHaveLength(2);
		// Emissions: 60 + 12 + 0 = 72 t; energy: (6000 + 1200) MW × (5/60) h = 600 MWh
		expect(result?.data[0].emissions).toBe(72);
		expect(result?.data[0].energy_mwh).toBeCloseTo(600, 6);
	});

	it('passes an energy basis through without conversion', () => {
		const response = {
			data: [
				metricEntry('emissions', [{ fueltech: 'coal_black', values: [[T0, 500]] }]),
				metricEntry('energy', [{ fueltech: 'coal_black', values: [[T0, 700]] }])
			]
		};
		const result = processEmissionsIntensity(response, { intervalHours: 24 });
		expect(result?.data[0].energy_mwh).toBe(700);
	});

	it('excludes the aggregate battery series from both sides', () => {
		const response = {
			data: [
				metricEntry('emissions', [
					{ fueltech: 'coal_black', values: [[T0, 100]] },
					{ fueltech: 'battery', values: [[T0, 999]] }
				]),
				metricEntry('power', [
					{ fueltech: 'coal_black', values: [[T0, 1200]] },
					{ fueltech: 'battery', values: [[T0, 9999]] }
				])
			]
		};
		const result = processEmissionsIntensity(response, { intervalHours: 1 });
		expect(result?.data[0].emissions).toBe(100);
		expect(result?.data[0].energy_mwh).toBe(1200);
	});

	it('applies grouping membership and hidden groups to both ratio components', () => {
		const response = {
			data: [
				metricEntry('emissions', [
					{ fueltech: 'coal_black', values: [[T0, 100]] },
					{ fueltech: 'wind', values: [[T0, 0]] },
					{ fueltech: 'unmapped_source', values: [[T0, 999]] }
				]),
				metricEntry('power', [
					{ fueltech: 'coal_black', values: [[T0, 100]] },
					{ fueltech: 'wind', values: [[T0, 200]] },
					{ fueltech: 'unmapped_source', values: [[T0, 999]] }
				])
			]
		};

		const result = processEmissionsIntensity(response, {
			intervalHours: 1,
			groupMap: { coal: ['coal_black'], wind: ['wind'] },
			excludedGroups: ['coal']
		});

		expect(result?.data[0].emissions).toBe(0);
		expect(result?.data[0].energy_mwh).toBe(200);
		expect(deriveIntensityDisplayRows(result?.data ?? [])[0].intensity).toBe(0);
	});

	it('returns null when either component is missing', () => {
		const emissionsOnly = {
			data: [metricEntry('emissions', [{ fueltech: 'coal_black', values: [[T0, 1]] }])]
		};
		expect(processEmissionsIntensity(emissionsOnly, { intervalHours: 1 })).toBeNull();
		expect(processEmissionsIntensity({ data: [] }, { intervalHours: 1 })).toBeNull();
	});
});

describe('deriveIntensityDisplayRows', () => {
	it('computes kgCO₂e/MWh as a ratio of sums', () => {
		const rows = [{ date: new Date(0), time: 0, emissions: 72, energy_mwh: 600 }];
		expect(deriveIntensityDisplayRows(rows)[0].intensity).toBeCloseTo(120, 6);
	});

	it('nulls buckets without positive energy', () => {
		const rows = [
			{ date: new Date(0), time: 0, emissions: 10, energy_mwh: 0 },
			{ date: new Date(1), time: 1, emissions: null, energy_mwh: 500 }
		];
		const derived = deriveIntensityDisplayRows(rows);
		expect(derived[0].intensity).toBeNull();
		expect(derived[1].intensity).toBeNull();
	});
});
