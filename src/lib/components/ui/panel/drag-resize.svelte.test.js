import { describe, it, expect, beforeEach } from 'vitest';
import { createDragHandler } from './drag-resize.svelte.js';

/**
 * The handler listens for `pointermove`/`pointerup` on `window`, so the drag
 * is driven with real pointer events on the jsdom window.
 * @param {number} clientX
 * @param {number} clientY
 */
function pointerDown(clientX, clientY) {
	return new PointerEvent('pointerdown', { clientX, clientY, cancelable: true });
}

/**
 * @param {number} clientX
 * @param {number} clientY
 */
function move(clientX, clientY) {
	window.dispatchEvent(new PointerEvent('pointermove', { clientX, clientY }));
}

function release() {
	window.dispatchEvent(new PointerEvent('pointerup'));
}

describe('createDragHandler', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('falls back to initial when storage is empty', () => {
		const drag = createDragHandler({
			axis: 'x',
			min: 100,
			max: 500,
			initial: 250,
			storageKey: 'test-empty'
		});
		expect(drag.value).toBe(250);
		expect(drag.isDragging).toBe(false);
	});

	it('loads a persisted value from storage', () => {
		localStorage.setItem('test-saved', '375');
		const drag = createDragHandler({
			axis: 'x',
			min: 100,
			max: 500,
			initial: 250,
			storageKey: 'test-saved'
		});
		expect(drag.value).toBe(375);
	});

	it('ignores out-of-range persisted values and falls back to initial', () => {
		localStorage.setItem('test-out-of-range', '9999');
		const drag = createDragHandler({
			axis: 'x',
			min: 100,
			max: 500,
			initial: 250,
			storageKey: 'test-out-of-range'
		});
		expect(drag.value).toBe(250);
	});

	it('mutates value during pointer drag and clamps to [min, max]', () => {
		const drag = createDragHandler({
			axis: 'x',
			min: 100,
			max: 500,
			initial: 250,
			storageKey: 'test-drag-x'
		});

		drag.start(pointerDown(200, 0));
		expect(drag.isDragging).toBe(true);

		move(320, 0);
		expect(drag.value).toBe(370);

		move(9999, 0);
		expect(drag.value).toBe(500);

		move(-9999, 0);
		expect(drag.value).toBe(100);

		release();
		expect(drag.isDragging).toBe(false);
		expect(localStorage.getItem('test-drag-x')).toBe('100');

		// The window listeners are removed on release: a later move no longer drags.
		move(320, 0);
		expect(drag.value).toBe(100);
	});

	it('reads clientY when axis is y', () => {
		const drag = createDragHandler({
			axis: 'y',
			min: 50,
			max: 400,
			initial: 200,
			storageKey: 'test-drag-y'
		});

		drag.start(pointerDown(0, 100));
		move(0, 180);
		expect(drag.value).toBe(280);
		release();
	});

	it('flips delta sign when invert is true', () => {
		const drag = createDragHandler({
			axis: 'x',
			min: 100,
			max: 500,
			initial: 300,
			storageKey: 'test-invert',
			invert: true
		});

		drag.start(pointerDown(200, 0));
		move(250, 0);
		expect(drag.value).toBe(250);
		release();
	});

	it('value setter updates the reactive state', () => {
		const drag = createDragHandler({
			axis: 'x',
			min: 100,
			max: 500,
			initial: 250,
			storageKey: 'test-setter'
		});
		drag.value = 400;
		expect(drag.value).toBe(400);
	});

	it('fraction mode scales pixel deltas by container size', () => {
		const drag = createDragHandler({
			axis: 'x',
			min: 0.2,
			max: 0.8,
			initial: 0.5,
			storageKey: 'test-fraction',
			scale: () => 1000
		});

		drag.start(pointerDown(500, 0));
		move(600, 0);
		// +100px / 1000px scale = +0.1 fraction
		expect(drag.value).toBeCloseTo(0.6, 5);

		move(9999, 0);
		expect(drag.value).toBeCloseTo(0.8, 5);

		move(-9999, 0);
		expect(drag.value).toBeCloseTo(0.2, 5);

		release();
		expect(parseFloat(localStorage.getItem('test-fraction') ?? '')).toBeCloseTo(0.2, 5);
	});

	it('fraction mode loads a persisted fractional value', () => {
		localStorage.setItem('test-fraction-load', '0.65');
		const drag = createDragHandler({
			axis: 'x',
			min: 0.2,
			max: 0.8,
			initial: 0.5,
			storageKey: 'test-fraction-load',
			scale: () => 800
		});
		expect(drag.value).toBeCloseTo(0.65, 5);
	});

	it('persist override bypasses localStorage on read and write', () => {
		localStorage.setItem('test-persist-override', '0.999'); // should be ignored
		/** @type {number[]} */
		const writes = [];
		const drag = createDragHandler({
			axis: 'x',
			min: 0.2,
			max: 0.8,
			initial: 0.5,
			storageKey: 'test-persist-override',
			scale: () => 1000,
			persist: {
				read: () => 0.42,
				write: (v) => writes.push(v)
			}
		});
		expect(drag.value).toBeCloseTo(0.42, 5);

		drag.start(pointerDown(100, 0));
		move(200, 0);
		release();

		expect(writes).toHaveLength(1);
		expect(writes[0]).toBeCloseTo(0.52, 5);
		// localStorage must remain untouched
		expect(localStorage.getItem('test-persist-override')).toBe('0.999');
	});

	it('persist.read returning null falls back to initial', () => {
		const drag = createDragHandler({
			axis: 'x',
			min: 0.2,
			max: 0.8,
			initial: 0.5,
			storageKey: 'unused',
			scale: () => 1000,
			persist: {
				read: () => null,
				write: () => {}
			}
		});
		expect(drag.value).toBeCloseTo(0.5, 5);
	});
});
