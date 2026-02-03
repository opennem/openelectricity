import { describe, it, expect } from 'vitest';
import {
	parseQuarterlyCSV,
	parseProjectionsCSV,
	aggregateToYearly,
	filterByFYRange,
	mergeData
} from '../helpers/csv-parser.js';

describe('parseQuarterlyCSV', () => {
	it('parses quarterly CSV data correctly', () => {
		const csv = `Quarter,Electricity,Stationary,Transport,Fugitives,Industrial,Agriculture,Waste,Land sector
Sep-04,51.24,22.17,20.32,10.93,7.48,21.85,3.96,19.39
Dec-04,46.28,19.27,21.19,10.54,7.51,21.85,3.96,19.39`;

		const data = parseQuarterlyCSV(csv);

		expect(data).toHaveLength(2);

		// First data point (Sep-04)
		expect(data[0].fy).toBe(2005);
		expect(data[0].interval).toBe('quarterly');
		expect(data[0].dataType).toBe('current');
		expect(data[0].electricity).toBeCloseTo(51.24, 2);
		expect(data[0].stationary_energy).toBeCloseTo(22.17, 2);
		expect(data[0].lulucf).toBeCloseTo(19.39, 2);

		// Net total should be sum of all sectors
		const expectedNetTotal = 51.24 + 22.17 + 20.32 + 10.93 + 7.48 + 21.85 + 3.96 + 19.39;
		expect(data[0].net_total).toBeCloseTo(expectedNetTotal, 1);
	});

	it('handles whitespace in values', () => {
		const csv = `Quarter,Electricity,Stationary
Sep-04, 51.24 , 22.17 `;

		const data = parseQuarterlyCSV(csv);
		expect(data[0].electricity).toBeCloseTo(51.24, 2);
	});

	it('returns empty array for empty input', () => {
		expect(parseQuarterlyCSV('')).toEqual([]);
		expect(parseQuarterlyCSV('Header\n')).toEqual([]);
	});

	it('classifies data types correctly', () => {
		// FY 2004 is history, FY 2005-2025 is current, FY 2026+ is projection
		const csv = `Quarter,Electricity
Dec-03,50
Sep-04,51
Sep-25,52`;

		const data = parseQuarterlyCSV(csv);

		// Dec-03 is FY 2004 (Dec 2003 is in FY 2004)
		expect(data[0].dataType).toBe('history');
		// Sep-04 is FY 2005
		expect(data[1].dataType).toBe('current');
		// Sep-25 is FY 2026
		expect(data[2].dataType).toBe('projection');
	});
});

describe('parseProjectionsCSV', () => {
	it('parses projections CSV and converts tonnes to Mt', () => {
		const csv = `Sector,1990,2000
Electricity,129530000,175680000
Transport,61180000,73850000`;

		const data = parseProjectionsCSV(csv);

		expect(data).toHaveLength(2);

		// 1990 data
		const d1990 = data.find((d) => d.fy === 1990);
		expect(d1990).toBeDefined();
		expect(d1990?.electricity).toBeCloseTo(129.53, 2); // 129530000 / 1000000
		expect(d1990?.transport).toBeCloseTo(61.18, 2);
		expect(d1990?.interval).toBe('annual');
		expect(d1990?.dataType).toBe('history');

		// 2000 data
		const d2000 = data.find((d) => d.fy === 2000);
		expect(d2000?.electricity).toBeCloseTo(175.68, 2);
		expect(d2000?.dataType).toBe('history');
	});

	it('handles negative LULUCF values', () => {
		const csv = `Sector,2023
LULUCF,-73700000`;

		const data = parseProjectionsCSV(csv);
		expect(data[0].lulucf).toBeCloseTo(-73.7, 1);
	});
});

describe('aggregateToYearly', () => {
	it('aggregates quarterly data to yearly by summing', () => {
		const quarterlyData = [
			{
				date: new Date(2004, 8, 1),
				time: new Date(2004, 8, 1).getTime(),
				fy: 2005,
				interval: /** @type {'quarterly'} */ ('quarterly'),
				dataType: /** @type {'current'} */ ('current'),
				electricity: 50,
				net_total: 50
			},
			{
				date: new Date(2004, 11, 1),
				time: new Date(2004, 11, 1).getTime(),
				fy: 2005,
				interval: /** @type {'quarterly'} */ ('quarterly'),
				dataType: /** @type {'current'} */ ('current'),
				electricity: 45,
				net_total: 45
			},
			{
				date: new Date(2005, 2, 1),
				time: new Date(2005, 2, 1).getTime(),
				fy: 2005,
				interval: /** @type {'quarterly'} */ ('quarterly'),
				dataType: /** @type {'current'} */ ('current'),
				electricity: 48,
				net_total: 48
			},
			{
				date: new Date(2005, 5, 1),
				time: new Date(2005, 5, 1).getTime(),
				fy: 2005,
				interval: /** @type {'quarterly'} */ ('quarterly'),
				dataType: /** @type {'current'} */ ('current'),
				electricity: 52,
				net_total: 52
			}
		];

		const yearly = aggregateToYearly(quarterlyData);

		expect(yearly).toHaveLength(1);
		expect(yearly[0].fy).toBe(2005);
		expect(yearly[0].interval).toBe('annual');
		// Sum of quarterly values: 50 + 45 + 48 + 52 = 195
		expect(yearly[0].electricity).toBe(195);
	});
});

describe('filterByFYRange', () => {
	it('filters data to specified FY range', () => {
		const data = [
			{ fy: 1990, time: 0 },
			{ fy: 2000, time: 1 },
			{ fy: 2010, time: 2 },
			{ fy: 2020, time: 3 },
			{ fy: 2030, time: 4 }
		];

		// @ts-ignore - simplified test data
		const filtered = filterByFYRange(data, 2005, 2025);

		expect(filtered).toHaveLength(2);
		expect(filtered.map((d) => d.fy)).toEqual([2010, 2020]);
	});

	it('includes boundary values', () => {
		const data = [
			{ fy: 2004, time: 0 },
			{ fy: 2005, time: 1 },
			{ fy: 2025, time: 2 },
			{ fy: 2026, time: 3 }
		];

		// @ts-ignore - simplified test data
		const filtered = filterByFYRange(data, 2005, 2025);

		expect(filtered.map((d) => d.fy)).toEqual([2005, 2025]);
	});
});

describe('mergeData', () => {
	it('merges multiple data arrays', () => {
		const data1 = [
			{ fy: 1990, time: 0, interval: 'annual' },
			{ fy: 1991, time: 1, interval: 'annual' }
		];
		const data2 = [
			{ fy: 2005, time: 2, interval: 'quarterly' },
			{ fy: 2006, time: 3, interval: 'quarterly' }
		];

		// @ts-ignore - simplified test data
		const merged = mergeData(data1, data2);

		expect(merged).toHaveLength(4);
		expect(merged.map((d) => d.fy)).toEqual([1990, 1991, 2005, 2006]);
	});

	it('prefers quarterly data over annual for same FY', () => {
		const annual = [{ fy: 2005, time: 0, interval: 'annual', source: 'annual' }];
		const quarterly = [{ fy: 2005, time: 1, interval: 'quarterly', source: 'quarterly' }];

		// @ts-ignore - simplified test data
		const merged = mergeData(annual, quarterly);

		expect(merged).toHaveLength(1);
		expect(merged[0].source).toBe('quarterly');
	});
});
