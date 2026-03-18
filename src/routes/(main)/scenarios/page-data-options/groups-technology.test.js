import { describe, it, expect } from 'vitest';
import { fuelTechMap, orderMap } from './groups-technology.js';

describe('groups-technology', () => {
	describe('homepage group registration', () => {
		it('has homepage_preview in fuelTechMap', () => {
			expect(fuelTechMap).toHaveProperty('homepage_preview');
			expect(fuelTechMap['homepage_preview']).toBeDefined();
		});

		it('has homepage_renewables_vs_fossil_fuels in fuelTechMap', () => {
			expect(fuelTechMap).toHaveProperty('homepage_renewables_vs_fossil_fuels');
			expect(fuelTechMap['homepage_renewables_vs_fossil_fuels']).toBeDefined();
		});

		it('has homepage_preview in orderMap', () => {
			expect(orderMap).toHaveProperty('homepage_preview');
			expect(Array.isArray(orderMap['homepage_preview'])).toBe(true);
			expect(orderMap['homepage_preview'].length).toBeGreaterThan(0);
		});

		it('has homepage_renewables_vs_fossil_fuels in orderMap', () => {
			expect(orderMap).toHaveProperty('homepage_renewables_vs_fossil_fuels');
			expect(Array.isArray(orderMap['homepage_renewables_vs_fossil_fuels'])).toBe(true);
		});

		it('homepage_preview fuelTechMap contains expected fuel tech groups', () => {
			const keys = Object.keys(fuelTechMap['homepage_preview']);
			expect(keys).toContain('coal');
			expect(keys).toContain('gas');
			expect(keys).toContain('wind');
			expect(keys).toContain('solar_utility');
			expect(keys).toContain('solar_rooftop');
			expect(keys).toContain('hydro');
		});

		it('homepage_preview order has 6 entries for the grid layout', () => {
			expect(orderMap['homepage_preview']).toEqual([
				'coal',
				'gas',
				'hydro',
				'wind',
				'solar_utility',
				'solar_rooftop'
			]);
		});

		it('homepage_renewables_vs_fossil_fuels order has fossil and renewable', () => {
			expect(orderMap['homepage_renewables_vs_fossil_fuels']).toContain('fossil');
			expect(orderMap['homepage_renewables_vs_fossil_fuels']).toContain('renewable');
		});
	});

	describe('existing groups still registered', () => {
		it('has simple group', () => {
			expect(fuelTechMap).toHaveProperty('simple');
			expect(orderMap).toHaveProperty('simple');
		});

		it('has detailed group', () => {
			expect(fuelTechMap).toHaveProperty('detailed');
			expect(orderMap).toHaveProperty('detailed');
		});
	});
});
