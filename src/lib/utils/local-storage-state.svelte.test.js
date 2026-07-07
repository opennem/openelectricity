import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLocalStorageState } from './local-storage-state.svelte.js';

/** Minimal localStorage shim for the test runner (node env, no DOM). */
function installLocalStorage() {
	const store = new Map();
	const ls = {
		getItem: (/** @type {string} */ k) => (store.has(k) ? store.get(k) : null),
		setItem: (/** @type {string} */ k, /** @type {string} */ v) => store.set(k, String(v)),
		removeItem: (/** @type {string} */ k) => store.delete(k),
		clear: () => store.clear()
	};
	globalThis.localStorage = /** @type {any} */ (ls);
	return ls;
}

describe('createLocalStorageState', () => {
	/** @type {ReturnType<typeof installLocalStorage>} */
	let ls;

	beforeEach(() => {
		ls = installLocalStorage();
	});

	afterEach(() => {
		// @ts-expect-error cleanup of the shim
		delete globalThis.localStorage;
	});

	it('falls back when nothing is stored', () => {
		const state = createLocalStorageState('k', 'peek');
		expect(state.value).toBe('peek');
	});

	it('initialises from a stored value and persists sets', () => {
		ls.setItem('k', JSON.stringify('full'));
		const state = createLocalStorageState('k', 'peek');
		expect(state.value).toBe('full');

		state.value = 'min';
		expect(ls.getItem('k')).toBe(JSON.stringify('min'));
		expect(createLocalStorageState('k', 'peek').value).toBe('min');
	});

	it('rejects stored values the validator refuses', () => {
		ls.setItem('k', JSON.stringify('sideways'));
		const state = createLocalStorageState('k', 'peek', (v) => v === 'peek' || v === 'full');
		expect(state.value).toBe('peek');
	});

	it('falls back on unparseable stored values', () => {
		ls.setItem('k', 'not-json{');
		const state = createLocalStorageState('k', 'peek');
		expect(state.value).toBe('peek');
	});

	it('works in-memory without localStorage', () => {
		// @ts-expect-error simulate SSR
		delete globalThis.localStorage;
		const state = createLocalStorageState('k', 'peek');
		state.value = 'full';
		expect(state.value).toBe('full');
	});
});
