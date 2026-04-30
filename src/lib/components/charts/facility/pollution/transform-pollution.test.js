import { describe, it, expect } from 'vitest';
import { transformPollutionData, buildCategoryMeta } from './transform-pollution.js';

/**
 * Mock data matching the real API shape:
 * Each series = one pollutant, with columns containing metadata.
 */
function makeMockData() {
	return [
		{
			network_code: 'AU',
			metric: 'pollution',
			unit: 'kg',
			interval: '1y',
			date_start: '2020-07-01T00:00:00',
			date_end: '2023-07-01T00:00:00',
			groupings: ['facility', 'pollutant'],
			network_timezone_offset: '+10:00',
			results: [
				{
					name: 'BAYSW',
					date_start: '2020-07-01T00:00:00',
					date_end: '2023-07-01T00:00:00',
					columns: {
						facility_name: 'Bayswater',
						pollutant_code: 'nox',
						pollutant_label: 'Nitrogen Oxides',
						pollutant_category: 'air_pollutant'
					},
					data: [
						['2020-07-01T00:00:00', 1200],
						['2021-07-01T00:00:00', 1100],
						['2022-07-01T00:00:00', 1050]
					]
				}
			]
		},
		{
			network_code: 'AU',
			metric: 'pollution',
			unit: 'kg',
			interval: '1y',
			date_start: '2020-07-01T00:00:00',
			date_end: '2023-07-01T00:00:00',
			groupings: ['facility', 'pollutant'],
			network_timezone_offset: '+10:00',
			results: [
				{
					name: 'BAYSW',
					date_start: '2020-07-01T00:00:00',
					date_end: '2023-07-01T00:00:00',
					columns: {
						facility_name: 'Bayswater',
						pollutant_code: 'so2',
						pollutant_label: 'Sulphur Dioxide',
						pollutant_category: 'air_pollutant'
					},
					data: [
						['2020-07-01T00:00:00', 500],
						['2021-07-01T00:00:00', 480],
						['2022-07-01T00:00:00', null]
					]
				}
			]
		},
		{
			network_code: 'AU',
			metric: 'pollution',
			unit: 'kg',
			interval: '1y',
			date_start: '2020-07-01T00:00:00',
			date_end: '2023-07-01T00:00:00',
			groupings: ['facility', 'pollutant'],
			network_timezone_offset: '+10:00',
			results: [
				{
					name: 'BAYSW',
					date_start: '2020-07-01T00:00:00',
					date_end: '2023-07-01T00:00:00',
					columns: {
						facility_name: 'Bayswater',
						pollutant_code: 'hg',
						pollutant_label: 'Mercury & compounds',
						pollutant_category: 'heavy_metal'
					},
					data: [
						['2020-07-01T00:00:00', 0.5],
						['2021-07-01T00:00:00', 0.4],
						['2022-07-01T00:00:00', 0.3]
					]
				}
			]
		}
	];
}

describe('transformPollutionData', () => {
	it('extracts sorted years', () => {
		const result = transformPollutionData(makeMockData());
		expect(result.years).toEqual(['2020', '2021', '2022']);
	});

	it('creates pollutant series from columns metadata', () => {
		const result = transformPollutionData(makeMockData());
		const nox = result.pollutants.find((p) => p.code === 'nox');
		expect(nox).toBeDefined();
		expect(nox?.values['2020']).toBe(1200);
		expect(nox?.values['2021']).toBe(1100);
		expect(nox?.label).toBe('Nitrogen Oxides');
		expect(nox?.category).toBe('air_pollutant');
	});

	it('preserves null values in series', () => {
		const result = transformPollutionData(makeMockData());
		const so2 = result.pollutants.find((p) => p.code === 'so2');
		expect(so2?.values['2022']).toBeNull();
	});

	it('groups pollutants by category from API metadata', () => {
		const result = transformPollutionData(makeMockData());
		expect(result.byCategory['air_pollutant']).toHaveLength(2);
		expect(result.byCategory['heavy_metal']).toHaveLength(1);
		expect(result.byCategory['organic']).toBeUndefined();
	});

	it('uses pollutant_label from API columns', () => {
		const result = transformPollutionData(makeMockData());
		const hg = result.pollutants.find((p) => p.code === 'hg');
		expect(hg?.label).toBe('Mercury & compounds');
	});

	it('returns empty structures for empty input', () => {
		const result = transformPollutionData([]);
		expect(result.years).toEqual([]);
		expect(result.pollutants).toEqual([]);
		expect(Object.keys(result.byCategory)).toHaveLength(0);
	});
});

describe('buildCategoryMeta', () => {
	it('returns ordered series names, palette colours, labels, and unit', () => {
		const result = transformPollutionData(makeMockData());
		const meta = buildCategoryMeta('air_pollutant', result.byCategory['air_pollutant']);

		expect(meta.seriesNames).toEqual(['nox', 'so2']);
		expect(meta.seriesLabels).toEqual({ nox: 'Nitrogen Oxides', so2: 'Sulphur Dioxide' });
		expect(meta.unit).toBe('kg');
		expect(typeof meta.seriesColours.nox).toBe('string');
		expect(typeof meta.seriesColours.so2).toBe('string');
	});

	it('returns an empty unit when the pollutant list is empty', () => {
		const meta = buildCategoryMeta('air_pollutant', []);
		expect(meta.seriesNames).toEqual([]);
		expect(meta.unit).toBe('');
	});
});
