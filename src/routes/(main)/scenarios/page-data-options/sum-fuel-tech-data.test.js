import { describe, it, expect } from 'vitest';
import sumFuelTechData from './sum-fuel-tech-data.js';

/** @param {Partial<StatsData>} overrides */
function makeStats(overrides = {}) {
	return {
		id: 'test',
		fuel_tech: 'solar_utility',
		type: 'energy',
		units: 'GWh',
		label: 'Solar',
		colour: '#ff0',
		history: {
			start: '2010-01-01',
			last: '2015-01-01',
			interval: '1M',
			data: [10, 20, 30]
		},
		...overrides
	};
}

const groupMap = {
	total_sources: ['solar_utility', 'coal_black', 'wind', 'hydro']
};

describe('sumFuelTechData', () => {
	it('returns null when no fuel techs match the group map', () => {
		const data = [makeStats({ fuel_tech: 'unknown_tech' })];
		expect(sumFuelTechData(data, 'history', groupMap)).toBe(null);
	});

	it('returns null when data array is empty', () => {
		expect(sumFuelTechData([], 'history', groupMap)).toBe(null);
	});

	it('sums values across multiple fuel techs', () => {
		const data = [
			makeStats({ fuel_tech: 'solar_utility', history: { start: '2010-01-01', last: '2010-03-01', interval: '1M', data: [10, 20, 30] } }),
			makeStats({ fuel_tech: 'wind', history: { start: '2010-01-01', last: '2010-03-01', interval: '1M', data: [5, 10, 15] } })
		];
		const result = sumFuelTechData(data, 'history', groupMap);
		expect(result.history.data).toEqual([15, 30, 45]);
	});

	it('uses max data length when fuel techs have different lengths', () => {
		const data = [
			makeStats({
				fuel_tech: 'coal_black',
				history: { start: '2010-01-01', last: '2012-01-01', interval: '1M', data: [100, 200] }
			}),
			makeStats({
				fuel_tech: 'solar_utility',
				history: { start: '2010-01-01', last: '2015-01-01', interval: '1M', data: [10, 20, 30, 40, 50] }
			})
		];
		const result = sumFuelTechData(data, 'history', groupMap);

		// Should use the longer array length (5), not the shorter one (2)
		expect(result.history.data).toHaveLength(5);
		// First two values summed from both fuel techs
		expect(result.history.data[0]).toBe(110);
		expect(result.history.data[1]).toBe(220);
		// Remaining values from solar only (coal_black has no data beyond index 1)
		expect(result.history.data[2]).toBe(30);
		expect(result.history.data[3]).toBe(40);
		expect(result.history.data[4]).toBe(50);
	});

	it('sets start/last to widest date range across all fuel techs', () => {
		const data = [
			makeStats({
				fuel_tech: 'coal_black',
				history: { start: '2010-01-01', last: '2016-05-01', interval: '1M', data: [100, 200] }
			}),
			makeStats({
				fuel_tech: 'solar_utility',
				history: { start: '2009-07-01', last: '2025-02-01', interval: '1M', data: [10, 20, 30, 40, 50] }
			})
		];
		const result = sumFuelTechData(data, 'history', groupMap);

		expect(result.history.start).toBe('2009-07-01');
		expect(result.history.last).toBe('2025-02-01');
	});

	it('negates load fuel techs when specified', () => {
		const loadGroupMap = { total_sources: ['solar_utility', 'battery_charging'] };
		const data = [
			makeStats({
				fuel_tech: 'solar_utility',
				history: { start: '2010-01-01', last: '2010-03-01', interval: '1M', data: [100, 200, 300] }
			}),
			makeStats({
				fuel_tech: 'battery_charging',
				history: { start: '2010-01-01', last: '2010-03-01', interval: '1M', data: [10, 20, 30] }
			})
		];
		const result = sumFuelTechData(data, 'history', loadGroupMap, {
			negateFuelTechs: ['battery_charging']
		});

		expect(result.history.data).toEqual([90, 180, 270]);
	});

	it('uses custom id/label/colour when provided', () => {
		const data = [makeStats({ fuel_tech: 'solar_utility' })];
		const result = sumFuelTechData(data, 'history', groupMap, {
			id: 'tas',
			label: 'Tasmania',
			colour: '#00bcd4'
		});

		expect(result.id).toBe('tas');
		expect(result.label).toBe('Tasmania');
		expect(result.colour).toBe('#00bcd4');
	});

	it('excludes groups listed in excludeGroups', () => {
		const multiGroupMap = {
			total_sources: ['solar_utility'],
			total_loads: ['battery_charging']
		};
		const data = [
			makeStats({ fuel_tech: 'solar_utility', history: { start: '2010-01-01', last: '2010-03-01', interval: '1M', data: [100] } }),
			makeStats({ fuel_tech: 'battery_charging', history: { start: '2010-01-01', last: '2010-03-01', interval: '1M', data: [50] } })
		];
		const result = sumFuelTechData(data, 'history', multiGroupMap, {
			excludeGroups: ['total_loads']
		});

		expect(result.history.data).toEqual([100]);
	});

	it('handles null values in data arrays without corrupting the sum', () => {
		const data = [
			makeStats({
				fuel_tech: 'solar_utility',
				history: { start: '2010-01-01', last: '2010-05-01', interval: '1M', data: [10, null, 30, null, 50] }
			}),
			makeStats({
				fuel_tech: 'wind',
				history: { start: '2010-01-01', last: '2010-05-01', interval: '1M', data: [5, 10, null, 20, 25] }
			})
		];
		const result = sumFuelTechData(data, 'history', groupMap);

		expect(result.history.data).toEqual([15, 10, 30, 20, 75]);
	});
});
