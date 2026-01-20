import { describe, it, expect, beforeEach } from 'vitest';
import {
	getCacheKey,
	shouldRefetch,
	getCachedFacilities,
	setCachedFacilities,
	clearCache
} from '../facilities-server-cache.js';

describe('Facilities cache', () => {
	beforeEach(() => {
		clearCache();
	});

	describe('getCacheKey', () => {
		it('should generate consistent cache key from filter params', () => {
			const params = {
				statuses: ['operating', 'commissioning'],
				regions: ['nsw', 'vic'],
				fuelTechs: ['solar_utility', 'wind']
			};
			const key = getCacheKey(params);
			expect(key).toBe('commissioning,operating|nsw,vic|solar_utility,wind');
		});

		it('should handle empty arrays', () => {
			const params = {
				statuses: ['operating'],
				regions: [],
				fuelTechs: []
			};
			const key = getCacheKey(params);
			expect(key).toBe('operating||');
		});

		it('should sort arrays for consistent keys', () => {
			const params1 = { statuses: ['operating', 'commissioning'], regions: [], fuelTechs: [] };
			const params2 = { statuses: ['commissioning', 'operating'], regions: [], fuelTechs: [] };
			expect(getCacheKey(params1)).toBe(getCacheKey(params2));
		});

		it('should handle single values', () => {
			const params = {
				statuses: ['operating'],
				regions: ['nsw'],
				fuelTechs: ['wind']
			};
			const key = getCacheKey(params);
			expect(key).toBe('operating|nsw|wind');
		});
	});

	describe('shouldRefetch', () => {
		it('should return true when statuses change', () => {
			const oldParams = { statuses: ['operating'], regions: [], fuelTechs: [] };
			const newParams = { statuses: ['operating', 'commissioning'], regions: [], fuelTechs: [] };
			expect(shouldRefetch(oldParams, newParams)).toBe(true);
		});

		it('should return true when regions change', () => {
			const oldParams = { statuses: ['operating'], regions: ['nsw'], fuelTechs: [] };
			const newParams = { statuses: ['operating'], regions: ['nsw', 'vic'], fuelTechs: [] };
			expect(shouldRefetch(oldParams, newParams)).toBe(true);
		});

		it('should return true when fuelTechs change', () => {
			const oldParams = { statuses: ['operating'], regions: [], fuelTechs: ['solar_utility'] };
			const newParams = { statuses: ['operating'], regions: [], fuelTechs: ['wind'] };
			expect(shouldRefetch(oldParams, newParams)).toBe(true);
		});

		it('should return false when filters are identical', () => {
			const oldParams = { statuses: ['operating'], regions: ['nsw'], fuelTechs: ['wind'] };
			const newParams = { statuses: ['operating'], regions: ['nsw'], fuelTechs: ['wind'] };
			expect(shouldRefetch(oldParams, newParams)).toBe(false);
		});

		it('should return false when only order differs', () => {
			const oldParams = {
				statuses: ['commissioning', 'operating'],
				regions: [],
				fuelTechs: []
			};
			const newParams = {
				statuses: ['operating', 'commissioning'],
				regions: [],
				fuelTechs: []
			};
			expect(shouldRefetch(oldParams, newParams)).toBe(false);
		});

		it('should return true when removing a filter value', () => {
			const oldParams = {
				statuses: ['operating', 'commissioning'],
				regions: [],
				fuelTechs: []
			};
			const newParams = { statuses: ['operating'], regions: [], fuelTechs: [] };
			expect(shouldRefetch(oldParams, newParams)).toBe(true);
		});
	});

	describe('cache operations', () => {
		it('should return null for cache miss', () => {
			const params = { statuses: ['operating'], regions: [], fuelTechs: [] };
			expect(getCachedFacilities(params)).toBeNull();
		});

		it('should store and retrieve cached facilities', () => {
			const params = { statuses: ['operating'], regions: [], fuelTechs: [] };
			const facilities = [{ code: 'ABC', name: 'Test Facility' }];

			setCachedFacilities(params, facilities);
			const cached = getCachedFacilities(params);

			expect(cached).toEqual(facilities);
		});

		it('should return different cached data for different params', () => {
			const params1 = { statuses: ['operating'], regions: [], fuelTechs: [] };
			const params2 = { statuses: ['commissioning'], regions: [], fuelTechs: [] };
			const facilities1 = [{ code: 'ABC', name: 'Facility 1' }];
			const facilities2 = [{ code: 'DEF', name: 'Facility 2' }];

			setCachedFacilities(params1, facilities1);
			setCachedFacilities(params2, facilities2);

			expect(getCachedFacilities(params1)).toEqual(facilities1);
			expect(getCachedFacilities(params2)).toEqual(facilities2);
		});

		it('should clear all cached data', () => {
			const params = { statuses: ['operating'], regions: [], fuelTechs: [] };
			const facilities = [{ code: 'ABC', name: 'Test Facility' }];

			setCachedFacilities(params, facilities);
			clearCache();

			expect(getCachedFacilities(params)).toBeNull();
		});

		it('should overwrite existing cache for same params', () => {
			const params = { statuses: ['operating'], regions: [], fuelTechs: [] };
			const facilities1 = [{ code: 'ABC', name: 'Facility 1' }];
			const facilities2 = [{ code: 'DEF', name: 'Facility 2' }];

			setCachedFacilities(params, facilities1);
			setCachedFacilities(params, facilities2);

			expect(getCachedFacilities(params)).toEqual(facilities2);
		});

		it('should handle params with different order but same values', () => {
			const params1 = {
				statuses: ['operating', 'commissioning'],
				regions: ['nsw', 'vic'],
				fuelTechs: ['wind']
			};
			const params2 = {
				statuses: ['commissioning', 'operating'],
				regions: ['vic', 'nsw'],
				fuelTechs: ['wind']
			};
			const facilities = [{ code: 'ABC', name: 'Test Facility' }];

			setCachedFacilities(params1, facilities);

			// Should find cached data even with different order
			expect(getCachedFacilities(params2)).toEqual(facilities);
		});
	});
});
