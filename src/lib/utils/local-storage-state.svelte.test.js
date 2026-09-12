import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLocalStorageState } from './local-storage-state.svelte.js';

describe('createLocalStorageState', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('falls back when nothing is stored', () => {
		const state = createLocalStorageState('k', 'peek');
		expect(state.value).toBe('peek');
	});

	it('initialises from a stored value and persists sets', () => {
		localStorage.setItem('k', JSON.stringify('full'));
		const state = createLocalStorageState('k', 'peek');
		expect(state.value).toBe('full');

		state.value = 'min';
		expect(localStorage.getItem('k')).toBe(JSON.stringify('min'));
		expect(createLocalStorageState('k', 'peek').value).toBe('min');
	});

	it('rejects stored values the validator refuses', () => {
		localStorage.setItem('k', JSON.stringify('sideways'));
		const state = createLocalStorageState('k', 'peek', (v) => v === 'peek' || v === 'full');
		expect(state.value).toBe('peek');
	});

	it('falls back on unparseable stored values', () => {
		localStorage.setItem('k', 'not-json{');
		const state = createLocalStorageState('k', 'peek');
		expect(state.value).toBe('peek');
	});

	it('works in-memory without localStorage', () => {
		// Simulate SSR: no storage global at all.
		vi.stubGlobal('localStorage', undefined);
		const state = createLocalStorageState('k', 'peek');
		state.value = 'full';
		expect(state.value).toBe('full');

		// Nothing leaked into the real store once it is back.
		vi.unstubAllGlobals();
		expect(localStorage.getItem('k')).toBeNull();
	});
});
