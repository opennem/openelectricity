import { describe, expect, it, vi } from 'vitest';
import { pngDimensions, settleChartAnimations, wrapText } from './png-export.js';

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
