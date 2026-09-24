import { afterEach, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { createTableColumnsPreference } from './table-columns.svelte.js';
import { DEFAULT_TABLE_COLUMNS } from './table-columns.js';

afterEach(() => localStorage.clear());

/** @param {(preference: ReturnType<typeof createTableColumnsPreference>) => void} fn */
function withPreference(fn) {
	const stop = $effect.root(() => {
		const preference = createTableColumnsPreference();
		fn(preference);
	});
	stop();
}

it('starts with the defaults, then restores the stored selection after mount', () => {
	localStorage.setItem('tracker-table-columns', JSON.stringify(['price', 'bogus', 'energy']));
	withPreference((preference) => {
		expect(preference.value).toEqual(['energy', 'power', 'contribution']);
		flushSync();
		expect(preference.value).toEqual(['energy', 'price']);
	});
});

it('stores normalised changes, including an explicitly empty selection', () => {
	withPreference((preference) => {
		flushSync();
		preference.value = ['intensity', 'energy', 'intensity'];
		expect(preference.value).toEqual(['energy', 'intensity']);
		expect(JSON.parse(localStorage.getItem('tracker-table-columns') ?? '')).toEqual([
			'energy',
			'intensity'
		]);
		preference.value = [];
	});
	withPreference((preference) => {
		flushSync();
		expect(preference.value).toEqual([]);
	});
});

it('falls back to the defaults for unparseable or foreign stored values', () => {
	for (const raw of ['not json', '"energy"', '{"energy":true}']) {
		localStorage.setItem('tracker-table-columns', raw);
		withPreference((preference) => {
			flushSync();
			expect(preference.value).toEqual(DEFAULT_TABLE_COLUMNS);
		});
	}
});
