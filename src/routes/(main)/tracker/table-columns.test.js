import { describe, expect, it } from 'vitest';
import { chartTableColumn } from './table-columns.js';

describe('chartTableColumn', () => {
	const modes = { energy: false, proportion: false, marketValue: false, intensity: false };

	it('maps generation to power, energy or contribution', () => {
		expect(chartTableColumn('generation', modes)).toBe('power');
		expect(chartTableColumn('generation', { ...modes, energy: true })).toBe('energy');
		expect(chartTableColumn('generation', { ...modes, energy: true, proportion: true })).toBe(
			'contribution'
		);
	});

	it('maps the price to its column and market value to none', () => {
		expect(chartTableColumn('market', modes)).toBe('price');
		expect(chartTableColumn('market', { ...modes, marketValue: true })).toBeNull();
	});

	it('maps emissions volume and intensity', () => {
		expect(chartTableColumn('emissions', modes)).toBe('emissions');
		expect(chartTableColumn('emissions', { ...modes, intensity: true })).toBe('intensity');
	});
});
