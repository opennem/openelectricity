import { describe, expect, it } from 'vitest';
import { computeExploreMetric } from './explore-metric.js';

const HOUR = 3_600_000;

describe('Explore metric summaries', () => {
	it('converts generation power buckets into energy across the selected range', () => {
		const result = computeExploreMetric(
			'generation',
			{},
			{
				seriesNames: ['wind', 'battery_charging'],
				data: [
					{ time: 0, wind: 100, battery_charging: -20 },
					{ time: HOUR, wind: 120, battery_charging: -10 }
				]
			},
			'power'
		);
		expect(result).toMatchObject({ label: 'Total generation', value: '220', unit: 'MWh' });
	});

	it('calculates the homepage renewable share as paired energy sums', () => {
		const result = computeExploreMetric(
			'renewables',
			{ renewableMeasure: 'share' },
			{
				seriesNames: ['renewable_generation', 'demand_gross'],
				data: [
					{ time: 0, renewable_generation: 40, demand_gross: 100 },
					{ time: HOUR, renewable_generation: 60, demand_gross: 100 }
				]
			},
			'energy'
		);
		expect(result).toMatchObject({ label: 'Renewable share', value: '50', unit: '%' });
	});

	it('reports average demand and price rather than summing rate values', () => {
		const demand = computeExploreMetric(
			'demand',
			{ demand: 'gross' },
			{
				seriesNames: ['demand_gross'],
				data: [
					{ time: 0, demand_gross: 100 },
					{ time: HOUR, demand_gross: 200 }
				]
			},
			'power'
		);
		const price = computeExploreMetric(
			'price',
			{},
			{
				seriesNames: ['price'],
				data: [
					{ time: 0, price: 50 },
					{ time: HOUR, price: 70 }
				]
			},
			'power'
		);
		expect(demand).toMatchObject({ value: '150', unit: 'MW' });
		expect(price).toMatchObject({ value: '60', unit: '$/MWh' });
	});

	it('excludes hidden fuel groups from applicable summary metrics', () => {
		const result = computeExploreMetric(
			'generation',
			{ group: 'simple' },
			{
				seriesNames: ['coal', 'wind'],
				data: [
					{ time: 0, coal: 100, wind: 20 },
					{ time: HOUR, coal: 100, wind: 30 }
				]
			},
			'power',
			['coal']
		);
		expect(result).toMatchObject({ value: '50', unit: 'MWh' });
	});

	it('calculates range emissions intensity from component totals', () => {
		const result = computeExploreMetric(
			'emissions',
			{ emissionsMode: 'intensity' },
			{
				seriesNames: ['emissions', 'energy_mwh'],
				data: [
					{ time: 0, emissions: 50, energy_mwh: 100 },
					{ time: HOUR, emissions: 25, energy_mwh: 50 }
				]
			},
			'energy'
		);
		expect(result).toMatchObject({ value: '500', unit: 'kgCO₂e/MWh' });
	});
});
