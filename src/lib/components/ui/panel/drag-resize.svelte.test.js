import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDragHandler } from './drag-resize.svelte.js';

/** Minimal localStorage shim for the test runner (node env, no DOM). */
function installLocalStorage() {
	const store = new Map();
	const ls = {
		getItem: (k) => (store.has(k) ? store.get(k) : null),
		setItem: (k, v) => store.set(k, String(v)),
		removeItem: (k) => store.delete(k),
		clear: () => store.clear()
	};
	globalThis.localStorage = /** @type {any} */ (ls);
	return ls;
}

/** Minimal window shim that captures registered event listeners. */
function installWindow() {
	const listeners = {};
	globalThis.window = /** @type {any} */ ({
		addEventListener: (type, fn) => {
			listeners[type] = fn;
		},
		removeEventListener: (type) => {
			delete listeners[type];
		}
	});
	return listeners;
}

describe('createDragHandler', () => {
	let listeners;

	beforeEach(() => {
		installLocalStorage();
		listeners = installWindow();
	});

	afterEach(() => {
		delete globalThis.localStorage;
		delete globalThis.window;
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

		drag.start(/** @type {any} */ ({ clientX: 200, clientY: 0, preventDefault: () => {} }));
		expect(drag.isDragging).toBe(true);

		listeners.pointermove({ clientX: 320, clientY: 0 });
		expect(drag.value).toBe(370);

		listeners.pointermove({ clientX: 9999, clientY: 0 });
		expect(drag.value).toBe(500);

		listeners.pointermove({ clientX: -9999, clientY: 0 });
		expect(drag.value).toBe(100);

		listeners.pointerup();
		expect(drag.isDragging).toBe(false);
		expect(localStorage.getItem('test-drag-x')).toBe('100');
	});

	it('reads clientY when axis is y', () => {
		const drag = createDragHandler({
			axis: 'y',
			min: 50,
			max: 400,
			initial: 200,
			storageKey: 'test-drag-y'
		});

		drag.start(/** @type {any} */ ({ clientX: 0, clientY: 100, preventDefault: () => {} }));
		listeners.pointermove({ clientX: 0, clientY: 180 });
		expect(drag.value).toBe(280);
		listeners.pointerup();
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

		drag.start(/** @type {any} */ ({ clientX: 200, clientY: 0, preventDefault: () => {} }));
		listeners.pointermove({ clientX: 250, clientY: 0 });
		expect(drag.value).toBe(250);
		listeners.pointerup();
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
});
