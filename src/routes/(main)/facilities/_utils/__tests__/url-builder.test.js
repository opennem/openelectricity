import { describe, it, expect } from 'vitest';
import { buildUrl } from '../url-builder.js';

describe('buildUrl', () => {
	it('should build URL with all params', () => {
		const params = {
			view: 'timeline',
			statuses: ['operating'],
			regions: ['nsw'],
			fuelTechs: ['solar_utility'],
			sizes: ['large'],
			facility: 'ABC123'
		};
		const url = buildUrl(params);
		expect(url).toBe(
			'/facilities?view=timeline&statuses=operating&regions=nsw&fuel_techs=solar_utility&sizes=large&facility=ABC123'
		);
	});

	it('should omit facility param when null', () => {
		const params = {
			view: 'list',
			statuses: ['operating'],
			regions: [],
			fuelTechs: [],
			sizes: [],
			facility: null
		};
		const url = buildUrl(params);
		expect(url).not.toContain('facility=');
		expect(url).toBe('/facilities?view=list&statuses=operating&regions=&fuel_techs=&sizes=');
	});

	it('should handle multiple values in arrays', () => {
		const params = {
			view: 'map',
			statuses: ['operating', 'commissioning'],
			regions: ['nsw', 'vic'],
			fuelTechs: ['wind', 'solar_utility'],
			sizes: ['small', 'medium'],
			facility: null
		};
		const url = buildUrl(params);
		expect(url).toContain('statuses=operating,commissioning');
		expect(url).toContain('regions=nsw,vic');
		expect(url).toContain('fuel_techs=wind,solar_utility');
		expect(url).toContain('sizes=small,medium');
	});

	it('should handle empty arrays', () => {
		const params = {
			view: 'timeline',
			statuses: [],
			regions: [],
			fuelTechs: [],
			sizes: [],
			facility: null
		};
		const url = buildUrl(params);
		expect(url).toBe('/facilities?view=timeline&statuses=&regions=&fuel_techs=&sizes=');
	});

	it('should handle undefined facility', () => {
		const params = {
			view: 'list',
			statuses: ['operating'],
			regions: ['nsw'],
			fuelTechs: ['wind'],
			sizes: ['large']
			// facility is not provided
		};
		const url = buildUrl(params);
		expect(url).not.toContain('facility=');
	});

	it('should handle all view types', () => {
		const baseParams = {
			statuses: ['operating'],
			regions: [],
			fuelTechs: [],
			sizes: [],
			facility: null
		};

		expect(buildUrl({ ...baseParams, view: 'list' })).toContain('view=list');
		expect(buildUrl({ ...baseParams, view: 'timeline' })).toContain('view=timeline');
		expect(buildUrl({ ...baseParams, view: 'map' })).toContain('view=map');
	});
});
