import { describe, it, expect } from 'vitest';
import { normaliseViewParam, regionShortLabels, VIEW_OPTIONS } from './filters.js';

describe('normaliseViewParam', () => {
	it("maps the legacy 'card' and 'grid' views to 'tiles'", () => {
		expect(normaliseViewParam('card')).toBe('tiles');
		expect(normaliseViewParam('grid')).toBe('tiles');
	});

	it('passes other values through untouched', () => {
		expect(normaliseViewParam('tiles')).toBe('tiles');
		expect(normaliseViewParam('timeline')).toBe('timeline');
		expect(normaliseViewParam(null)).toBe(null);
	});
});

describe('VIEW_OPTIONS', () => {
	it('uses tiles as the canonical switcher and query-string value', () => {
		expect(VIEW_OPTIONS.at(-1)).toEqual({ label: 'Tiles', value: 'tiles' });
	});
});

describe('regionShortLabels', () => {
	it('maps region codes to short labels', () => {
		expect(regionShortLabels).toMatchObject({
			nsw1: 'NSW',
			qld1: 'QLD',
			sa1: 'SA',
			tas1: 'TAS',
			vic1: 'VIC',
			wem: 'WA'
		});
	});
});
