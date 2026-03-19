import { describe, it, expect } from 'vitest';
import processTechnology from './process-technology.js';

/**
 * Create a minimal StatsData entry with valid structure for Statistic + TimeSeries pipeline.
 * Uses yearly projection data (1Y interval) matching the scenario format.
 */
function makeProjectionStats({ fuelTech, data, units = 'GWh' }) {
	return {
		id: `au.fuel_tech.${fuelTech}.energy`,
		type: 'energy',
		code: fuelTech,
		fuel_tech: fuelTech,
		units,
		label: fuelTech,
		colour: '#aaa',
		projection: {
			start: '2024-07-01T00:00:00+10:00',
			last: '2026-07-01T00:00:00+10:00',
			interval: '1Y',
			data
		}
	};
}

function makeHistoryStats({ fuelTech, data, units = 'GWh' }) {
	return {
		id: `au.fuel_tech.${fuelTech}.energy`,
		type: 'energy',
		code: fuelTech,
		fuel_tech: fuelTech,
		units,
		label: fuelTech,
		colour: '#bbb',
		history: {
			start: '2022-01-01T00:00:00+10:00',
			last: '2024-12-01T00:00:00+10:00',
			interval: '1M',
			data
		}
	};
}

/** Simple colourReducer matching the pattern used in the app */
const colourReducer = (acc, d) => {
	acc[d.id] = d.colour || '#999';
	return acc;
};

/** 36 months of data (3 years worth for FY rollup) */
function monthlyData(baseValue) {
	return Array.from({ length: 36 }, (_, i) => baseValue + i);
}

describe('processTechnology', () => {
	describe('generation', () => {
		it('returns a valid ProcessedDataViz shape', () => {
			const projection = [
				makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] }),
				makeProjectionStats({ fuelTech: 'wind', data: [200, 220, 240] })
			];
			const history = [
				makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) }),
				makeHistoryStats({ fuelTech: 'wind', data: monthlyData(100) })
			];

			const result = processTechnology.generation({
				projection,
				history,
				group: 'simple',
				colourReducer,
				includeBatteryAndLoads: false
			});

			expect(result).toHaveProperty('seriesData');
			expect(result).toHaveProperty('seriesNames');
			expect(result).toHaveProperty('seriesColours');
			expect(result).toHaveProperty('seriesLabels');
			expect(result).toHaveProperty('yDomain');
			expect(result).toHaveProperty('baseUnit');
			expect(result).toHaveProperty('prefix');
			expect(result).toHaveProperty('displayPrefix');
			expect(result).toHaveProperty('allowedPrefixes');
		});

		it('returns displayPrefix T and allowedPrefixes G/T for energy', () => {
			const projection = [
				makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] })
			];
			const history = [
				makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) })
			];

			const result = processTechnology.generation({
				projection,
				history,
				group: 'simple',
				colourReducer,
				includeBatteryAndLoads: false
			});

			expect(result.displayPrefix).toBe('T');
			expect(result.allowedPrefixes).toEqual(['G', 'T']);
		});

		it('has seriesData with time and date properties', () => {
			const projection = [
				makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] })
			];
			const history = [
				makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) })
			];

			const result = processTechnology.generation({
				projection,
				history,
				group: 'simple',
				colourReducer,
				includeBatteryAndLoads: false
			});

			expect(result.seriesData.length).toBeGreaterThan(0);
			result.seriesData.forEach((d) => {
				expect(d).toHaveProperty('time');
				expect(d).toHaveProperty('date');
				expect(d.date).toBeInstanceOf(Date);
				// FY mutation: all dates should be 1 January
				expect(d.date.getMonth()).toBe(0);
				expect(d.date.getDate()).toBe(1);
			});
		});

		it('projection first FY matches expected year for 2024-07-01 start', () => {
			const projection = [
				makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] })
			];
			const history = [
				makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) })
			];

			const result = processTechnology.generation({
				projection,
				history,
				group: 'simple',
				colourReducer,
				includeBatteryAndLoads: false
			});

			// Projection start is 2024-07-01 → after mutateDatesToStartOfYear(data, 1) → 2025-01-01 (FY2025)
			expect(result.projectionStartTime).toBeDefined();
			const startDate = new Date(result.projectionStartTime);
			expect(startDate.getFullYear()).toBe(2025);
			expect(startDate.getMonth()).toBe(0);
			expect(startDate.getDate()).toBe(1);
		});

		it('combined data has no duplicate timestamps', () => {
			const projection = [
				makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] })
			];
			const history = [
				makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) })
			];

			const result = processTechnology.generation({
				projection,
				history,
				group: 'simple',
				colourReducer,
				includeBatteryAndLoads: false
			});

			const times = result.seriesData.map((d) => d.time);
			const uniqueTimes = [...new Set(times)];
			expect(times.length).toBe(uniqueTimes.length);
		});

		it('projectionStartTime aligns with history end (no gap)', () => {
			const projection = [
				makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] })
			];
			const history = [
				makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) })
			];

			const result = processTechnology.generation({
				projection,
				history,
				group: 'simple',
				colourReducer,
				includeBatteryAndLoads: false
			});

			if (result.projectionStartTime) {
				const projStart = result.projectionStartTime;
				// Find the last historical point (before projection start)
				const historicalPoints = result.seriesData.filter((d) => d.time < projStart);
				if (historicalPoints.length > 0) {
					const lastHistorical = historicalPoints[historicalPoints.length - 1];
					const gap = projStart - lastHistorical.time;
					// Gap should be roughly 1 year (within tolerance of leap years)
					const oneYearMs = 365.25 * 24 * 60 * 60 * 1000;
					expect(gap).toBeLessThanOrEqual(oneYearMs * 1.01);
					expect(gap).toBeGreaterThanOrEqual(oneYearMs * 0.99);
				}
			}
		});
	});

	describe('capacity', () => {
		it('returns displayPrefix G for capacity', () => {
			const projection = [
				makeProjectionStats({ fuelTech: 'solar_utility', data: [5000, 6000, 7000], units: 'MW' })
			];
			const history = [
				makeHistoryStats({ fuelTech: 'solar_utility', data: Array(36).fill(4000), units: 'MW' })
			];
			// Capacity history uses 1Y interval
			history[0].history.interval = '1Y';
			history[0].history.start = '2010-07-01T00:00:00+10:00';
			history[0].history.last = '2024-07-01T00:00:00+10:00';
			history[0].history.data = Array.from({ length: 15 }, (_, i) => 3000 + i * 100);

			const result = processTechnology.capacity({
				projection,
				history,
				group: 'simple',
				colourReducer,
				includeBatteryAndLoads: false
			});

			expect(result.displayPrefix).toBe('G');
			expect(result.allowedPrefixes).toEqual(['M', 'G']);
		});
	});

	describe('emissions', () => {
		it('returns a single series for total emissions', () => {
			const projection = [
				makeProjectionStats({ fuelTech: 'fossil_fuels', data: [50000, 45000, 40000], units: 'tCO2e' })
			];
			const history = [
				makeHistoryStats({ fuelTech: 'coal', data: monthlyData(3000), units: 'tCO2e' }),
				makeHistoryStats({ fuelTech: 'gas_ccgt', data: monthlyData(1000), units: 'tCO2e' })
			];

			const result = processTechnology.emissions({
				projection,
				history,
				includeBatteryAndLoads: false
			});

			expect(result.seriesNames).toContain('au.emissions.total');
			expect(result.seriesLabels['au.emissions.total']).toBe('Emissions Volume');
			expect(result.seriesColours['au.emissions.total']).toBe('#444444');
			expect(result.displayPrefix).toBe('k');
		});
	});

	describe('intensity', () => {
		it('returns chartType line with correct units', () => {
			const processedEmissions = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), 'au.emissions.total': 500 },
					{ time: 2, date: new Date('2023-01-01'), 'au.emissions.total': 400 }
				],
				seriesNames: ['au.emissions.total'],
				seriesColours: { 'au.emissions.total': '#444' },
				seriesLabels: { 'au.emissions.total': 'Emissions' },
				yDomain: [0, 500]
			};

			const processedEnergy = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), _max: 1000 },
					{ time: 2, date: new Date('2023-01-01'), _max: 1100 }
				],
				seriesNames: ['solar'],
				seriesColours: {},
				seriesLabels: {},
				yDomain: [0, 1100]
			};

			const result = processTechnology.intensity({
				processedEmissions,
				processedEnergy
			});

			expect(result.chartType).toBe('line');
			expect(result.baseUnit).toBe('kgCO2e/MWh');
			expect(result.yDomain).toEqual([0, 1200]);
			expect(result.seriesNames).toContain('au.emission_intensity');
		});

		it('divides emissions by net generation for intensity values', () => {
			const processedEmissions = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), 'au.emissions.total': 600 }
				],
				seriesNames: ['au.emissions.total'],
				seriesColours: {},
				seriesLabels: {},
				yDomain: [0, 600]
			};

			const processedEnergy = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), _max: 1200 }
				],
				seriesNames: ['solar'],
				seriesColours: {},
				seriesLabels: {},
				yDomain: [0, 1200]
			};

			const result = processTechnology.intensity({
				processedEmissions,
				processedEnergy
			});

			expect(result.seriesData[0]['au.emission_intensity']).toBe(0.5);
		});
	});
});
