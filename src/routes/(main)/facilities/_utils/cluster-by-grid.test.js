import { describe, it, expect } from 'vitest';
import { clusterByGrid } from './cluster-by-grid.js';

// `clusterByGrid` bins by `Math.floor(coord / cellSize)`. With cellSize=0.5
// the bin -33.0 starts at lat=-33 and runs UP to (but not including) -32.5
// — so e.g. -33.0 and -32.8 share a cell, but -33.0 and -32.4 don't.

describe('clusterByGrid', () => {
	it('returns an empty array for empty input', () => {
		expect(clusterByGrid([])).toEqual([]);
	});

	it('returns one cell per facility when they fall in different grid cells', () => {
		const data = [
			{ position: /** @type {[number, number]} */ ([150, -33]), weight: 100 },
			{ position: /** @type {[number, number]} */ ([145, -37]), weight: 200 }
		];
		const out = clusterByGrid(data, 0.5);
		expect(out).toHaveLength(2);
		expect(out.map((c) => c.count)).toEqual([1, 1]);
	});

	it('aggregates count and weight when facilities share a grid cell', () => {
		const data = [
			{ position: /** @type {[number, number]} */ ([150.1, -32.6]), weight: 1000 },
			{ position: /** @type {[number, number]} */ ([150.2, -32.7]), weight: 500 },
			{ position: /** @type {[number, number]} */ ([150.3, -32.8]), weight: 800 }
		];
		const out = clusterByGrid(data, 0.5);
		expect(out).toHaveLength(1);
		expect(out[0].count).toBe(3);
		expect(out[0].weight).toBe(2300);
	});

	it('emits the centroid (mean lat/lng) of facilities in the cell', () => {
		const data = [
			{ position: /** @type {[number, number]} */ ([150.0, -32.9]), weight: 1 },
			{ position: /** @type {[number, number]} */ ([150.4, -32.7]), weight: 1 }
		];
		const [{ position }] = clusterByGrid(data, 0.5);
		expect(position[0]).toBeCloseTo(150.2, 5);
		expect(position[1]).toBeCloseTo(-32.8, 5);
	});

	it('averages colour across facilities in the cell', () => {
		const data = [
			{
				position: /** @type {[number, number]} */ ([150, -32.9]),
				weight: 1,
				color: /** @type {[number, number, number]} */ ([200, 0, 0])
			},
			{
				position: /** @type {[number, number]} */ ([150.1, -32.8]),
				weight: 1,
				color: /** @type {[number, number, number]} */ ([0, 200, 0])
			}
		];
		const [{ color }] = clusterByGrid(data, 0.5);
		expect(color).toEqual([100, 100, 0]);
	});

	it('honours a smaller cellSize for finer grids', () => {
		const data = [
			{ position: /** @type {[number, number]} */ ([150.05, -32.95]), weight: 1 },
			{ position: /** @type {[number, number]} */ ([150.25, -32.75]), weight: 1 }
		];
		// 0.5° cell — both fall in the same bin (lng floor 300, lat floor -66)
		expect(clusterByGrid(data, 0.5)).toHaveLength(1);
		// 0.1° cell — different bins
		expect(clusterByGrid(data, 0.1)).toHaveLength(2);
	});
});
