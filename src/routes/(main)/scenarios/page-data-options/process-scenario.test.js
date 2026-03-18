import { describe, it, expect } from 'vitest';
import processScenario from './process-scenario.js';

function makeProjectionStats({ fuelTech, data, units = 'GWh', start = '2024-07-01T00:00:00+10:00' }) {
	return {
		id: `au.fuel_tech.${fuelTech}.energy`,
		type: 'energy',
		code: fuelTech,
		fuel_tech: fuelTech,
		units,
		label: fuelTech,
		colour: '#aaa',
		projection: {
			start,
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

describe('processScenario', () => {
	describe('getScenarioColours', () => {
		it('returns colour map with historical as black', () => {
			const names = ['historical', 'aemo2024-step_change-CDP14'];
			const result = processScenario.getScenarioColours(names);

			expect(result).toHaveProperty('historical');
			expect(result.historical).toBe('#000');
		});

		it('returns colours for each scenario pathway', () => {
			const names = [
				'historical',
				'aemo2024-step_change-CDP14',
				'aemo2024-progressive_change-CDP14'
			];
			const result = processScenario.getScenarioColours(names);

			expect(Object.keys(result)).toHaveLength(3);
			expect(result['aemo2024-step_change-CDP14']).toBeDefined();
			expect(result['aemo2024-progressive_change-CDP14']).toBeDefined();
		});

		it('brightens colours for multiple pathways of same scenario', () => {
			const names = [
				'historical',
				'aemo2024-step_change-CDP14',
				'aemo2024-step_change-CDP15'
			];
			const result = processScenario.getScenarioColours(names);

			// Two pathways of the same scenario should have different colours
			expect(result['aemo2024-step_change-CDP14']).not.toBe(
				result['aemo2024-step_change-CDP15']
			);
		});
	});

	describe('intensity', () => {
		it('returns chartType line with correct units', () => {
			const processedEmissions = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), historical: 500, 'aemo2024-step_change-CDP14': 400 },
					{ time: 2, date: new Date('2023-01-01'), historical: 480, 'aemo2024-step_change-CDP14': 350 }
				],
				seriesNames: ['historical', 'aemo2024-step_change-CDP14'],
				seriesColours: { historical: '#000', 'aemo2024-step_change-CDP14': '#f00' },
				seriesLabels: { historical: 'Historical', 'aemo2024-step_change-CDP14': 'Step Change' },
				yDomain: [0, 500]
			};

			const processedEnergy = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), historical: 1000, 'aemo2024-step_change-CDP14': 1100 },
					{ time: 2, date: new Date('2023-01-01'), historical: 1050, 'aemo2024-step_change-CDP14': 1200 }
				],
				seriesNames: ['historical', 'aemo2024-step_change-CDP14'],
				seriesColours: {},
				seriesLabels: {},
				yDomain: [0, 1200]
			};

			const result = processScenario.intensity({
				processedEmissions,
				processedEnergy
			});

			expect(result.chartType).toBe('line');
			expect(result.baseUnit).toBe('kgCO2e/MWh');
			expect(result.yDomain).toEqual([0, 1200]);
		});

		it('computes intensity per series as emissions/energy', () => {
			const processedEmissions = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), historical: 600 }
				],
				seriesNames: ['historical'],
				seriesColours: { historical: '#000' },
				seriesLabels: { historical: 'Historical' },
				yDomain: [0, 600]
			};

			const processedEnergy = {
				seriesData: [
					{ time: 1, date: new Date('2022-01-01'), historical: 1200 }
				],
				seriesNames: ['historical'],
				seriesColours: {},
				seriesLabels: {},
				yDomain: [0, 1200]
			};

			const result = processScenario.intensity({
				processedEmissions,
				processedEnergy
			});

			expect(result.seriesData[0].historical).toBe(0.5);
		});
	});

	describe('generation', () => {
		it('returns chartType line for scenario comparison', () => {
			const projections = [
				{
					id: 'aemo2024-step_change-CDP14',
					model: 'aemo2024',
					scenario: 'step_change',
					pathway: 'CDP14',
					projectionEnergyData: [
						makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] }),
						makeProjectionStats({ fuelTech: 'wind', data: [200, 220, 240] })
					],
					projectionCapacityData: [],
					projectionEmissionsData: []
				}
			];

			const history = [
				makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) }),
				makeHistoryStats({ fuelTech: 'wind', data: monthlyData(100) })
			];

			const result = processScenario.generation({
				projections,
				history,
				includeBatteryAndLoads: false
			});

			expect(result.chartType).toBe('line');
			expect(result.displayPrefix).toBe('T');
			expect(result.allowedPrefixes).toEqual(['G', 'T']);
		});

		it('returns seriesData with time and date properties', () => {
			const projections = [
				{
					id: 'aemo2024-step_change-CDP14',
					model: 'aemo2024',
					scenario: 'step_change',
					pathway: 'CDP14',
					projectionEnergyData: [
						makeProjectionStats({ fuelTech: 'solar_utility', data: [100, 110, 120] })
					],
					projectionCapacityData: [],
					projectionEmissionsData: []
				}
			];

			const history = [
				makeHistoryStats({ fuelTech: 'solar_utility', data: monthlyData(50) })
			];

			const result = processScenario.generation({
				projections,
				history,
				includeBatteryAndLoads: false
			});

			expect(result.seriesData.length).toBeGreaterThan(0);
			result.seriesData.forEach((d) => {
				expect(d).toHaveProperty('time');
				expect(d).toHaveProperty('date');
				expect(d.date).toBeInstanceOf(Date);
			});
		});
	});
});
