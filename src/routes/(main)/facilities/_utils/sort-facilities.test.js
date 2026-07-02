import { describe, it, expect } from 'vitest';
import { getNextSort } from './sort-facilities.js';

describe('getNextSort', () => {
	it('flips the order when the current field is re-picked', () => {
		expect(getNextSort('name', 'name', 'asc')).toEqual({ sortBy: 'name', sortOrder: 'desc' });
		expect(getNextSort('name', 'name', 'desc')).toEqual({ sortBy: 'name', sortOrder: 'asc' });
	});

	it('starts capacity and storage descending', () => {
		expect(getNextSort('capacity', 'name', 'asc')).toEqual({
			sortBy: 'capacity',
			sortOrder: 'desc'
		});
		expect(getNextSort('storage', 'name', 'asc')).toEqual({
			sortBy: 'storage',
			sortOrder: 'desc'
		});
	});

	it('starts name and region ascending', () => {
		expect(getNextSort('name', 'capacity', 'desc')).toEqual({ sortBy: 'name', sortOrder: 'asc' });
		expect(getNextSort('region', 'capacity', 'desc')).toEqual({
			sortBy: 'region',
			sortOrder: 'asc'
		});
	});
});
