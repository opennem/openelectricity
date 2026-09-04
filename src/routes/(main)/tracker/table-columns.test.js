import { describe, expect, it } from 'vitest';
import { scrollTargetFor, visibleValueColumns } from './table-columns.js';

// Narrow-mode geometry: Technology 160px, then Av power 100, Contribution 120,
// Av price 100 — a 480px table.
const techWidth = 160;
const columns = [
	{ offsetLeft: 160, width: 100 },
	{ offsetLeft: 260, width: 120 },
	{ offsetLeft: 380, width: 100 }
];
const tableWidth = 480;

/** @param {number} scrollLeft @param {number} viewportWidth @param {number} [tolerance] */
function inView(scrollLeft, viewportWidth, tolerance) {
	return visibleValueColumns({ scrollLeft, viewportWidth, techWidth, columns, tolerance });
}

describe('visibleValueColumns', () => {
	it('reports the fully visible columns at the panel floor as the strip scrolls', () => {
		// 320px panel: a 160px value region shows one column at a time.
		expect(inView(0, 320)).toEqual([true, false, false]);
		expect(inView(100, 320)).toEqual([false, true, false]);
		// Max scroll (160): Av price rests at the right edge, Contribution is cut.
		expect(inView(160, 320)).toEqual([false, false, true]);
	});

	it('lights every column that fits when two are in view', () => {
		expect(inView(0, 400)).toEqual([true, true, false]);
		expect(inView(80, 400)).toEqual([false, true, true]);
	});

	it('lights all columns once the table fits', () => {
		expect(inView(0, 480)).toEqual([true, true, true]);
	});

	it('forgives sub-pixel rounding at the region edge', () => {
		expect(inView(0, 479)).toEqual([true, true, true]);
		expect(inView(0, 479, 0)).toEqual([true, true, false]);
	});

	it('falls back to the largest overlap when no column fits', () => {
		// An 80px region is narrower than any column.
		expect(inView(0, 240)).toEqual([true, false, false]);
		expect(inView(100, 240)).toEqual([false, true, false]);
	});

	it('returns an empty list for no columns', () => {
		expect(
			visibleValueColumns({ scrollLeft: 0, viewportWidth: 320, techWidth, columns: [] })
		).toEqual([]);
	});
});

describe('scrollTargetFor', () => {
	it('aligns a column with the left edge of the value region', () => {
		expect(scrollTargetFor(columns[0], { techWidth, viewportWidth: 320, tableWidth })).toBe(0);
		expect(scrollTargetFor(columns[1], { techWidth, viewportWidth: 320, tableWidth })).toBe(100);
	});

	it('clamps to the scroll range so the target matches where a snap rests', () => {
		expect(scrollTargetFor(columns[2], { techWidth, viewportWidth: 320, tableWidth })).toBe(160);
		expect(scrollTargetFor(columns[2], { techWidth, viewportWidth: 480, tableWidth })).toBe(0);
		expect(scrollTargetFor(columns[2], { techWidth, viewportWidth: 600, tableWidth })).toBe(0);
	});

	it('never scrolls to a negative offset', () => {
		expect(
			scrollTargetFor({ offsetLeft: 40, width: 100 }, { techWidth, viewportWidth: 320, tableWidth })
		).toBe(0);
	});
});
