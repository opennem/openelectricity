import { describe, it, expect } from 'vitest';
import { filterScenarioData, normaliseEmissions } from './utils';

/**
 * Helper to create a mock scenario data record
 * @param {object} overrides
 * @returns {any}
 */
function makeRecord(overrides = {}) {
	return {
		id: 'au.nem.nsw1.fuel_tech.coal_black.energy.step_change.cdp3',
		type: 'energy',
		network: 'nem',
		region: 'nsw1',
		fuel_tech: 'coal_black',
		scenario: 'step_change',
		pathway: 'CDP3',
		units: 'GWh',
		projection: {
			start: '2024-07-01T00:00:00+10:00',
			last: '2051-07-01T00:00:00+10:00',
			interval: '1Y',
			data: [1000, 2000, 3000]
		},
		...overrides
	};
}

describe('filterScenarioData', () => {
	const data = [
		makeRecord({ pathway: 'CDP3', region: 'nsw1', type: 'energy' }),
		makeRecord({ pathway: 'CDP3', region: 'nsw1', type: 'capacity' }),
		makeRecord({ pathway: 'CDP3', region: 'vic1', type: 'energy' }),
		makeRecord({ pathway: 'CDP14', region: 'nsw1', type: 'energy' }),
		makeRecord({ pathway: 'CDP3', region: 'nsw1', type: 'emissions' })
	];

	it('returns all data when no filters provided', () => {
		const result = filterScenarioData(data, {});
		expect(result).toHaveLength(5);
	});

	it('filters by pathway only', () => {
		const result = filterScenarioData(data, { pathway: 'CDP3' });
		expect(result).toHaveLength(4);
		expect(result.every((d) => d.pathway === 'CDP3')).toBe(true);
	});

	it('filters by region only', () => {
		const result = filterScenarioData(data, { region: 'nsw1' });
		expect(result).toHaveLength(4);
		expect(result.every((d) => d.region === 'nsw1')).toBe(true);
	});

	it('filters by dataType only', () => {
		const result = filterScenarioData(data, { dataType: 'energy' });
		expect(result).toHaveLength(3);
		expect(result.every((d) => d.type === 'energy')).toBe(true);
	});

	it('filters by all three params combined', () => {
		const result = filterScenarioData(data, {
			pathway: 'CDP3',
			region: 'nsw1',
			dataType: 'energy'
		});
		expect(result).toHaveLength(1);
		expect(result[0].pathway).toBe('CDP3');
		expect(result[0].region).toBe('nsw1');
		expect(result[0].type).toBe('energy');
	});

	it('handles case-insensitive region matching', () => {
		const result = filterScenarioData(data, { region: 'NSw1' });
		expect(result).toHaveLength(4);
	});

	it('returns empty array when no records match', () => {
		const result = filterScenarioData(data, { pathway: 'CDP99' });
		expect(result).toHaveLength(0);
	});
});

describe('normaliseEmissions', () => {
	it('multiplies emissions projection data by 1000 (ktCO2e → tCO2e)', () => {
		const data = [
			makeRecord({
				type: 'emissions',
				units: 'ktCO2e',
				projection: { data: [100, 200, 300] }
			})
		];
		const result = normaliseEmissions(data);
		expect(result[0].projection.data).toEqual([100000, 200000, 300000]);
	});

	it('updates units field to tCO2e', () => {
		const data = [
			makeRecord({
				type: 'emissions',
				units: 'ktCO2e',
				projection: { data: [50] }
			})
		];
		const result = normaliseEmissions(data);
		expect(result[0].units).toBe('tCO2e');
	});

	it('leaves energy data unchanged', () => {
		const data = [makeRecord({ type: 'energy', projection: { data: [1000, 2000] } })];
		const result = normaliseEmissions(data);
		expect(result[0].projection.data).toEqual([1000, 2000]);
	});

	it('leaves capacity data unchanged', () => {
		const data = [makeRecord({ type: 'capacity', projection: { data: [500] } })];
		const result = normaliseEmissions(data);
		expect(result[0].projection.data).toEqual([500]);
	});

	it('handles mixed data types', () => {
		const data = [
			makeRecord({ type: 'energy', projection: { data: [2000] } }),
			makeRecord({ type: 'emissions', units: 'ktCO2e', projection: { data: [50] } }),
			makeRecord({ type: 'capacity', projection: { data: [4000] } })
		];
		const result = normaliseEmissions(data);
		expect(result[0].projection.data).toEqual([2000]);
		expect(result[1].projection.data).toEqual([50000]);
		expect(result[2].projection.data).toEqual([4000]);
	});

	it('does not mutate the original data', () => {
		const original = [
			makeRecord({ type: 'emissions', units: 'ktCO2e', projection: { data: [100] } })
		];
		const result = normaliseEmissions(original);
		expect(result[0]).not.toBe(original[0]);
		expect(result[0].projection).not.toBe(original[0].projection);
		expect(original[0].projection.data).toEqual([100]);
	});

	it('handles empty array', () => {
		expect(normaliseEmissions([])).toEqual([]);
	});
});
