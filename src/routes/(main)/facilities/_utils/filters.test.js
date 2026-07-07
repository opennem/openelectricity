import { describe, it, expect } from 'vitest';
import { normaliseViewParam, regionShortLabels } from './filters.js';

describe('normaliseViewParam', () => {
	it("maps the legacy 'card' view to 'grid'", () => {
		expect(normaliseViewParam('card')).toBe('grid');
	});

	it('passes other values through untouched', () => {
		expect(normaliseViewParam('grid')).toBe('grid');
		expect(normaliseViewParam('timeline')).toBe('timeline');
		expect(normaliseViewParam(null)).toBe(null);
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
