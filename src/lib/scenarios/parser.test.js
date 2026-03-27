import { describe, it, expect } from 'vitest';
import parser from './parser';

describe('scenario parser', () => {
	it('extracts unique pathways from data', () => {
		const result = parser({
			data: [
				{ pathway: 'CDP3', fuel_tech: 'coal' },
				{ pathway: 'CDP3', fuel_tech: 'gas' },
				{ pathway: 'CDP14', fuel_tech: 'coal' }
			]
		});
		expect(result.pathways).toEqual(['CDP3', 'CDP14']);
	});

	it('extracts unique fuel techs sorted alphabetically', () => {
		const result = parser({
			data: [
				{ pathway: 'CDP3', fuel_tech: 'wind' },
				{ pathway: 'CDP3', fuel_tech: 'coal' },
				{ pathway: 'CDP3', fuel_tech: 'solar' },
				{ pathway: 'CDP3', fuel_tech: 'coal' }
			]
		});
		expect(result.fuelTechs).toEqual(['coal', 'solar', 'wind']);
	});

	it('returns data array as-is', () => {
		const data = [
			{ pathway: 'CDP3', fuel_tech: 'coal', projection: { data: [1, 2, 3] } }
		];
		const result = parser({ data });
		expect(result.data).toEqual(data);
	});

	it('handles empty data array', () => {
		const result = parser({ data: [] });
		expect(result.data).toEqual([]);
		expect(result.pathways).toEqual([]);
		expect(result.fuelTechs).toEqual([]);
	});

	it('handles missing data property', () => {
		const result = parser({});
		expect(result.data).toEqual([]);
		expect(result.pathways).toEqual([]);
		expect(result.fuelTechs).toEqual([]);
	});

	it('handles null input', () => {
		const result = parser(null);
		expect(result.data).toEqual([]);
		expect(result.pathways).toEqual([]);
		expect(result.fuelTechs).toEqual([]);
	});
});
