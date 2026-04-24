import { describe, it, expect } from 'vitest';
import ChartStore from './ChartStore.svelte.js';

/**
 * Build a minimal ChartStore configured for the derivations under test.
 * @param {{ curveType?: 'straight' | 'smooth' | 'step', xDomain?: [number, number], data?: Array<{time: number, date: Date, a?: number}> }} [opts]
 */
function createChart(opts = {}) {
	const { curveType = 'straight', xDomain, data } = opts;
	const chart = new ChartStore({ key: Symbol('test') });
	chart.chartOptions.selectedCurveType = curveType;
	chart.seriesNames = ['a'];
	chart.seriesData = data ?? [];
	if (xDomain) chart.xDomain = xDomain;
	return chart;
}

describe('ChartStore step-mode domain derivations', () => {
	it('stepIntervalMs is 0 when the curve is not step', () => {
		const chart = createChart({
			curveType: 'straight',
			data: [
				{ time: 0, date: new Date(0), a: 10 },
				{ time: 1000, date: new Date(1000), a: 20 }
			]
		});
		expect(chart.stepIntervalMs).toBe(0);
	});

	it('stepIntervalMs is 0 in step mode when there are fewer than 2 points', () => {
		const chart = createChart({
			curveType: 'step',
			data: [{ time: 0, date: new Date(0), a: 10 }]
		});
		expect(chart.stepIntervalMs).toBe(0);
	});

	it('stepIntervalMs is the gap between the last two points in step mode', () => {
		const chart = createChart({
			curveType: 'step',
			data: [
				{ time: 0, date: new Date(0), a: 10 },
				{ time: 1000, date: new Date(1000), a: 20 },
				{ time: 3000, date: new Date(3000), a: 30 }
			]
		});
		// Last interval: 3000 - 1000 = 2000
		expect(chart.stepIntervalMs).toBe(2000);
	});

	it('renderXDomain equals xDomain when not in step mode', () => {
		const chart = createChart({
			curveType: 'straight',
			xDomain: [0, 10_000],
			data: [
				{ time: 0, date: new Date(0), a: 10 },
				{ time: 1000, date: new Date(1000), a: 20 }
			]
		});
		expect(chart.renderXDomain).toEqual([0, 10_000]);
	});

	it('renderXDomain extends xDomain by one full interval in step mode', () => {
		const chart = createChart({
			curveType: 'step',
			xDomain: [0, 3000],
			data: [
				{ time: 0, date: new Date(0), a: 10 },
				{ time: 1000, date: new Date(1000), a: 20 },
				{ time: 3000, date: new Date(3000), a: 30 }
			]
		});
		// Last interval = 2000 → [0, 3000 + 2000]. Under curveStepAfter the
		// last bar spans [T_n, T_n + I], so the render domain needs the
		// full extension (not half).
		expect(chart.renderXDomain).toEqual([0, 5000]);
	});

	it('renderXDomain returns the xDomain unchanged when stepIntervalMs is 0', () => {
		const chart = createChart({
			curveType: 'step',
			xDomain: [0, 100],
			data: [{ time: 0, date: new Date(0), a: 10 }]
		});
		// Only one point → stepIntervalMs = 0, no extension
		expect(chart.renderXDomain).toEqual([0, 100]);
	});

	it('renderXDomain returns xDomain (undefined) when xDomain is not set', () => {
		const chart = createChart({ curveType: 'step', data: [] });
		expect(chart.renderXDomain).toBeUndefined();
	});

	it('pointer→time and time→pixel agree when both use renderXDomain (hover alignment)', () => {
		// This is the invariant that was broken: InteractionLayer used
		// xDomain while LayerCake's $xScale used renderXDomain, so the same
		// pixel mapped to two different times — off by stepIntervalMs at
		// the right edge. After the fix, both read renderXDomain and agree.
		const chart = createChart({
			curveType: 'step',
			xDomain: [0, 1000],
			data: [
				{ time: 0, date: new Date(0), a: 10 },
				{ time: 1000, date: new Date(1000), a: 20 }
			]
		});
		const [min, max] = /** @type {[number, number]} */ (chart.renderXDomain);
		const widthPx = 100;

		// Simulate `InteractionLayer.clientXToTime` at the right edge, using
		// renderXDomain (the fix). This must equal what LayerCake draws at
		// that pixel, which is also renderXDomain's max.
		const ratioAtRightEdge = 1;
		const interactionTime = min + ratioAtRightEdge * (max - min);
		const layerCakeTimeAtRightEdge = max;
		expect(interactionTime).toBe(layerCakeTimeAtRightEdge);

		// Last real data point at T=1000 sits at 1/2 of the chart width
		// (render width covers [0, 2000] so T=1000 is halfway).
		const lastRealPointPx = (widthPx * (1000 - min)) / (max - min);
		expect(lastRealPointPx).toBeCloseTo(widthPx / 2, 10);
	});

	it('renderXDomain tracks xDomain changes reactively', () => {
		const chart = createChart({
			curveType: 'step',
			xDomain: [0, 1000],
			data: [
				{ time: 0, date: new Date(0), a: 10 },
				{ time: 1000, date: new Date(1000), a: 20 }
			]
		});
		// Initial: interval = 1000 → [0, 2000]
		expect(chart.renderXDomain).toEqual([0, 2000]);

		// Pan to a new viewport — renderXDomain should update
		chart.xDomain = [500, 1000];
		expect(chart.renderXDomain).toEqual([500, 2000]);
	});
});
