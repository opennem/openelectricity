import { describe, it, expect } from 'vitest';
import processRegion from './process-region.js';

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

function monthlyData(baseValue) {
	return Array.from({ length: 36 }, (_, i) => baseValue + i);
}

function makeRegion({ id, label, colour, projectionData, historyData }) {
	return {
		id,
		label,
		colour,
		projectionEnergyData: projectionData,
		projectionCapacityData: [],
		projectionEmissionsData: [],
		historicalEnergyData: historyData,
		historicalCapacityData: [],
		historicalEmissionsData: []
	};
}

describe('processRegion', () => {
	describe('generation', () => {
		it('returns chartType line for region comparison', () => {
			const regionsData = [
				makeRegion({
					id: 'nsw',
					label: 'New South Wales',
					colour: '#1a73e8',
					projectionData: [
						makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] }),
						makeProjectionStats({ fuelTech: 'wind', data: [200, 220, 240] })
					],
					historyData: [
						makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) }),
						makeHistoryStats({ fuelTech: 'wind', data: monthlyData(100) })
					]
				}),
				makeRegion({
					id: 'vic',
					label: 'Victoria',
					colour: '#e8501a',
					projectionData: [
						makeProjectionStats({ fuelTech: 'solar_utility', data: [80, 90, 100] }),
						makeProjectionStats({ fuelTech: 'wind', data: [150, 170, 190] })
					],
					historyData: [
						makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(40) }),
						makeHistoryStats({ fuelTech: 'wind', data: monthlyData(80) })
					]
				})
			];

			const result = processRegion.generation({
				regionsData,
				includeBatteryAndLoads: false
			});

			expect(result.chartType).toBe('line');
			expect(result.displayPrefix).toBe('T');
			expect(result.allowedPrefixes).toEqual(['G', 'T']);
		});

		it('returns seriesData with time and date properties', () => {
			const regionsData = [
				makeRegion({
					id: 'nsw',
					label: 'New South Wales',
					colour: '#1a73e8',
					projectionData: [
						makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] })
					],
					historyData: [
						makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) })
					]
				})
			];

			const result = processRegion.generation({
				regionsData,
				includeBatteryAndLoads: false
			});

			expect(result.seriesData.length).toBeGreaterThan(0);
			result.seriesData.forEach((d) => {
				expect(d).toHaveProperty('time');
				expect(d).toHaveProperty('date');
				expect(d.date).toBeInstanceOf(Date);
			});
		});

		it('creates a series for each region', () => {
			const regionsData = [
				makeRegion({
					id: 'nsw',
					label: 'NSW',
					colour: '#1a73e8',
					projectionData: [
						makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] })
					],
					historyData: [
						makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) })
					]
				}),
				makeRegion({
					id: 'vic',
					label: 'VIC',
					colour: '#e8501a',
					projectionData: [
						makeProjectionStats({ fuelTech: 'solar_utility', data: [80, 90, 100] })
					],
					historyData: [
						makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(40) })
					]
				})
			];

			const result = processRegion.generation({
				regionsData,
				includeBatteryAndLoads: false
			});

			// Should have series for both regions
			expect(result.seriesNames).toContain('nsw');
			expect(result.seriesNames).toContain('vic');
		});
	});

	describe('intensity', () => {
		it('returns chartType line with correct units', () => {
			const processedEmissions = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), nsw: 500, vic: 400 }
				],
				seriesNames: ['nsw', 'vic'],
				seriesColours: { nsw: '#1a73e8', vic: '#e8501a' },
				seriesLabels: { nsw: 'NSW', vic: 'VIC' },
				yDomain: [0, 500]
			};

			const processedEnergy = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), nsw: 1000, vic: 800 }
				],
				seriesNames: ['nsw', 'vic'],
				seriesColours: {},
				seriesLabels: {},
				yDomain: [0, 1000]
			};

			const result = processRegion.intensity({
				processedEmissions,
				processedEnergy
			});

			expect(result.chartType).toBe('line');
			expect(result.baseUnit).toBe('kgCO2e/MWh');
			expect(result.yDomain).toEqual([0, 1200]);
		});

		it('computes intensity per region', () => {
			const processedEmissions = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), nsw: 600, vic: 300 }
				],
				seriesNames: ['nsw', 'vic'],
				seriesColours: { nsw: '#1a73e8', vic: '#e8501a' },
				seriesLabels: { nsw: 'NSW', vic: 'VIC' },
				yDomain: [0, 600]
			};

			const processedEnergy = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), nsw: 1200, vic: 600 }
				],
				seriesNames: ['nsw', 'vic'],
				seriesColours: {},
				seriesLabels: {},
				yDomain: [0, 1200]
			};

			const result = processRegion.intensity({
				processedEmissions,
				processedEnergy
			});

			expect(result.seriesData[0].nsw).toBe(0.5);
			expect(result.seriesData[0].vic).toBe(0.5);
		});
	});
});
