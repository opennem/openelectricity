import { describe, it, expect } from 'vitest';
import {
	CHART_FAMILIES,
	getFamily,
	getAvailableFamilies,
	getDefaultForFamily
} from './chart-families.js';

describe('CHART_FAMILIES', () => {
	it('includes dot family with correct shape', () => {
		expect(CHART_FAMILIES.dot).toEqual({
			label: 'Dot',
			variants: ['dot'],
			variantLabels: {},
			defaultVariant: 'dot'
		});
	});

	it('all families have required properties', () => {
		for (const [, config] of Object.entries(CHART_FAMILIES)) {
			expect(config).toHaveProperty('label');
			expect(config).toHaveProperty('variants');
			expect(config).toHaveProperty('variantLabels');
			expect(config).toHaveProperty('defaultVariant');
			expect(config.variants).toContain(config.defaultVariant);
		}
	});
});

describe('getFamily', () => {
	it('maps stacked-area to area', () => {
		expect(getFamily('stacked-area')).toBe('area');
	});

	it('maps area to area', () => {
		expect(getFamily('area')).toBe('area');
	});

	it('maps bar-stacked to bar', () => {
		expect(getFamily('bar-stacked')).toBe('bar');
	});

	it('maps grouped-bar to bar', () => {
		expect(getFamily('grouped-bar')).toBe('bar');
	});

	it('maps line to line', () => {
		expect(getFamily('line')).toBe('line');
	});

	it('maps dot to dot', () => {
		expect(getFamily('dot')).toBe('dot');
	});

	it('defaults to area for unknown types', () => {
		expect(getFamily('unknown')).toBe('area');
	});
});

describe('getAvailableFamilies', () => {
	it('returns all families for time-series mode', () => {
		const families = getAvailableFamilies(false);
		expect(families).toContain('area');
		expect(families).toContain('bar');
		expect(families).toContain('line');
		expect(families).toContain('dot');
	});

	it('returns only bar for category mode', () => {
		expect(getAvailableFamilies(true)).toEqual(['bar']);
	});

	it('does not include dot in category mode', () => {
		expect(getAvailableFamilies(true)).not.toContain('dot');
	});
});

describe('getDefaultForFamily', () => {
	it('returns stacked-area for area family', () => {
		expect(getDefaultForFamily('area')).toBe('stacked-area');
	});

	it('returns bar-stacked for bar family', () => {
		expect(getDefaultForFamily('bar')).toBe('bar-stacked');
	});

	it('returns line for line family', () => {
		expect(getDefaultForFamily('line')).toBe('line');
	});

	it('returns dot for dot family', () => {
		expect(getDefaultForFamily('dot')).toBe('dot');
	});
});
