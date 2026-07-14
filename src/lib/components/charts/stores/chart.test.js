import { describe, it, expect } from 'vitest';
import ChartStore from './chart.svelte.js';

describe('ChartStore (v1) stacked min/max derivations', () => {
	/**
	 * @param {Array<{time: number, date: Date, a?: number | null, b?: number | null}>} data
	 */
	function createAreaChart(data) {
		const chart = new ChartStore({ key: Symbol('test') });
		// Default chart type is 'area' (isChartTypeArea = stacked)
		chart.seriesNames = ['a', 'b'];
		chart.seriesData = data;
		return chart;
	}

	const allNegativeRows = [
		{ time: 0, date: new Date(0), a: -80, b: -20 },
		{ time: 1000, date: new Date(1000), a: -60, b: -10 }
	];

	it('sums only positive values into _max (negatives stack below zero)', () => {
		const chart = createAreaChart([{ time: 0, date: new Date(0), a: 100, b: -40 }]);
		const [row] = chart.seriesScaledDataWithMinMax;
		expect(row._max).toBe(100);
		expect(row._min).toBe(-40);
	});

	it('keeps _max at 0 for all-negative rows so the zero line stays on-plot', () => {
		const chart = createAreaChart(allNegativeRows);
		const [first, second] = chart.seriesScaledDataWithMinMax;
		expect(first._max).toBe(0);
		expect(first._min).toBe(-100);
		expect(second._max).toBe(0);
		expect(second._min).toBe(-70);
	});

	it('yDomain includes 0 when every value is negative', () => {
		const chart = createAreaChart(allNegativeRows);
		const [min, max] = chart.yDomain;
		expect(min).toBeLessThan(0);
		expect(max).toBe(0);
	});

	it('poisons _max to NaN when a value is undefined (legacy row semantics)', () => {
		// Row is missing series 'b' — the NaN from +undefined must propagate so
		// downstream consumers can tell an incomplete row from a real total.
		const chart = createAreaChart([{ time: 0, date: new Date(0), a: 100 }]);
		const [row] = chart.seriesScaledDataWithMinMax;
		expect(row._max).toBeNaN();
		expect(row._min).toBe(0);
	});

	it('yDomain pads the max by 10% for positive data', () => {
		const chart = createAreaChart([{ time: 0, date: new Date(0), a: 60, b: 40 }]);
		// max: 100 + 10% = 110, min: 0
		expect(chart.yDomain).toEqual([0, 110]);
	});

	it('customYDomain short-circuits the computed domain', () => {
		const chart = createAreaChart(allNegativeRows);
		chart.customYDomain = [-500, 500];
		expect(chart.yDomain).toEqual([-500, 500]);
	});
});
