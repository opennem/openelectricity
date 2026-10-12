import { describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { createComparePins } from './compare-pins.svelte.js';

const a = 1_000;
const b = 2_000;

/** @param {number[]} times */
const snapshot = (times) =>
	/** @type {import('../types.js').ChartSnapshot} */ ({
		queryKey: 'q',
		start: times[0],
		end: /** @type {number} */ (times.at(-1)),
		data: times.map((time) => ({ time, coal: time / 10 })),
		nativeData: [],
		seriesNames: ['coal'],
		seriesLabels: {},
		seriesColours: {}
	});

function harness() {
	const state = $state({
		identity: 'nsw|power',
		snapshot: /** @type {import('../types.js').ChartSnapshot | null} */ (snapshot([a, b])),
		pair: { a: /** @type {number | null} */ (a), b: /** @type {number | null} */ (b) }
	});
	const pins = createComparePins({
		identity: () => state.identity,
		snapshot: () => state.snapshot,
		pair: () => state.pair
	});
	return { state, pins };
}

describe('compare pins', () => {
	it('holds A and B while a pan moves them off screen', () => {
		const { state, pins } = harness();
		expect(Object.keys(pins.rows).map(Number)).toEqual([a, b]);
		state.snapshot = snapshot([b, 3_000]);
		flushSync();
		expect(pins.rows[a]).toEqual({ time: a, coal: 100 });
		state.snapshot = null;
		flushSync();
		expect(Object.keys(pins.rows).map(Number)).toEqual([a, b]);
	});
	it('takes the latest reading of a date still on screen', () => {
		const { state, pins } = harness();
		state.snapshot = { ...snapshot([a, b]), data: [{ time: a, coal: 7 }] };
		flushSync();
		expect(pins.rows[a]?.coal).toBe(7);
	});
	it('drops held rows once the chart draws other series, and forgets moved dates', () => {
		const { state, pins } = harness();
		expect(Object.keys(pins.rows).length).toBe(2);
		state.snapshot = snapshot([3_000]);
		state.identity = 'vic1|power';
		flushSync();
		expect(Object.keys(pins.rows).length).toBe(0);
		state.identity = 'nsw|power';
		state.snapshot = snapshot([a, b]);
		flushSync();
		state.pair = { a: 3_000, b };
		state.snapshot = snapshot([b]);
		flushSync();
		expect(Object.keys(pins.rows).map(Number)).toEqual([b]);
	});
});
