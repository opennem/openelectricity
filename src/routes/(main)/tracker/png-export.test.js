// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
	capturePngSnapshot,
	pngDimensions,
	settleChartAnimations,
	wrapText
} from './png-export.js';

describe('PNG snapshot capture', () => {
	/** @param {string} inner */
	const mount = (inner) => {
		document.body.innerHTML = `<main><section data-png-context="Compare" data-tracker-png='{"id":"regions-share","label":"Renewables","ready":true,"caption":"Monthly"}'>${inner}</section></main>`;
		for (const canvas of Array.from(document.querySelectorAll('canvas')))
			canvas.toDataURL = () => 'data:image/png;base64,AA==';
		for (const element of Array.from(
			document.querySelectorAll('svg, canvas, [data-chart-area], .stratum-chart-area')
		))
			element.getBoundingClientRect = () =>
				/** @type {DOMRect} */ ({
					left: 10,
					top: 20,
					width: 300,
					height: 120,
					right: 310,
					bottom: 140,
					x: 10,
					y: 20,
					toJSON: () => ({})
				});
		return capturePngSnapshot(/** @type {HTMLElement} */ (document.querySelector('main')));
	};
	it('captures a chart that draws its own SVG layers', () => {
		const snapshot = mount(
			`<div data-chart-image='{"hasData":true,"title":"Renewables","unit":"%","legend":[]}'><div data-chart-area><svg data-png-layer><rect data-png-exclude/><rect fill="#fff"/></svg></div></div>`
		);
		expect(snapshot.charts).toHaveLength(1);
		expect(snapshot.charts[0].ready).toBe(true);
		expect(snapshot.charts[0].caption).toBe('Compare · Monthly');
		expect(snapshot.charts[0].svg).toContain('<rect');
		expect(snapshot.charts[0].svg).not.toContain('data-png-exclude');
		expect(snapshot.charts[0].width).toBe(300);
	});
	it('embeds canvas layers as raster images under the SVG chrome', () => {
		const snapshot = mount(
			`<div data-chart-image='{"hasData":true,"legend":[]}'><div data-chart-area><canvas data-png-layer></canvas><svg data-png-layer><text>NSW</text></svg></div></div>`
		);
		expect(snapshot.charts[0].ready).toBe(true);
		expect(snapshot.charts[0].svg).toContain('<image');
		expect(snapshot.charts[0].svg).toContain('NSW');
	});
	it('still captures LayerCake charts and reports unready ones', () => {
		const ready = mount(
			`<div data-chart-image='{"hasData":true,"legend":[]}'><div class="stratum-chart-area"><svg class="layercake-layout-svg"></svg></div></div>`
		);
		expect(ready.charts[0].ready).toBe(true);
		const missing = mount(
			`<div data-chart-image='{"hasData":true,"legend":[]}'><div data-chart-area></div></div>`
		);
		expect(missing.charts[0].ready).toBe(false);
		expect(missing.charts[0].svg).toBe('');
	});
});

it('waits for finite transitions, but not loading spinners or paused animation', async () => {
	let finish = () => {};
	const transition = new Promise((resolve) => {
		finish = () => resolve(undefined);
	});
	const root = {
		getAnimations: () => [
			{
				playState: 'running',
				effect: { getComputedTiming: () => ({ endTime: 400 }) },
				finished: transition
			},
			{
				playState: 'running',
				effect: { getComputedTiming: () => ({ endTime: Infinity }) },
				finished: new Promise(() => {})
			},
			{
				playState: 'paused',
				effect: { getComputedTiming: () => ({ endTime: 400 }) },
				finished: new Promise(() => {})
			}
		]
	};
	let settled = false;
	const pending = settleChartAnimations(/** @type {any} */ (root)).then(() => {
		settled = true;
	});
	await Promise.resolve();
	expect(settled).toBe(false);
	finish();
	await pending;
	expect(settled).toBe(true);
});

it('bounds a transition that never settles and clears its timer', async () => {
	vi.useFakeTimers();
	try {
		const root = {
			getAnimations: () => [
				{
					playState: 'running',
					effect: { getComputedTiming: () => ({ endTime: 400 }) },
					finished: new Promise(() => {})
				}
			]
		};
		const pending = settleChartAnimations(/** @type {any} */ (root));
		await vi.advanceTimersByTimeAsync(1000);
		await pending;
		expect(vi.getTimerCount()).toBe(0);
	} finally {
		vi.useRealTimers();
	}
});

describe('PNG layout', () => {
	it('wraps words and explicit paragraphs', () => {
		expect(wrapText('one two three\nfour', 7, (value) => value.length)).toEqual([
			'one two',
			'three',
			'four'
		]);
	});
	it('wraps long tokens without losing characters', () => {
		expect(wrapText('abcdefghij', 3, (value) => value.length)).toEqual(['abc', 'def', 'ghi', 'j']);
	});
	it('preserves empty lines and Unicode characters', () => {
		expect(wrapText('A\n\n😀😀😀', 4, (value) => value.length)).toEqual(['A', '', '😀😀', '😀']);
	});
	it('exports normal charts at double density', () => {
		expect(pngDimensions(1000, 1800)).toEqual({ width: 2000, height: 3600, scale: 2 });
	});
	it('bounds very tall and wide images for browser canvas limits', () => {
		for (const [width, height] of [
			[1280, 15000],
			[15000, 1280],
			[5000, 5000]
		]) {
			const result = pngDimensions(width, height);
			expect(result.width).toBeLessThanOrEqual(8192);
			expect(result.height).toBeLessThanOrEqual(8192);
			expect(result.width * result.height).toBeLessThan(24_020_000);
		}
	});
	it('rejects invalid dimensions', () => {
		for (const value of [0, -1, NaN, Infinity])
			expect(() => pngDimensions(value, 100)).toThrow('Invalid image dimensions');
	});
});
