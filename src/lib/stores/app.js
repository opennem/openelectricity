import { readable, writable } from 'svelte/store';
import { browser } from '$app/environment';

// Get value from localStorage if in browser and the value is stored, otherwise fallback
function fromLocalStorage(storageKey, fallbackValue) {
	if (browser) {
		const storedValue = window.localStorage.getItem(storageKey);

		if (storedValue !== 'undefined' && storedValue !== null) {
			return typeof fallbackValue === 'object'
				? JSON.parse(storedValue)
				: storedValue === 'true'
				? true
				: storedValue === 'false'
				? false
				: storedValue;
		}
	}

	return fallbackValue;
}
function toLocalStorage(store, storageKey) {
	if (browser) {
		store.subscribe((value) => {
			let storageValue = typeof value === 'object' ? JSON.stringify(value) : value;

			window.localStorage.setItem(storageKey, storageValue);
		});
	}
}

/** @type {import('svelte/store').Readable<string>} */
// export const dataTrackerLink = readable(
// 	'https://feature-234-site-design-upda.opennem-fe-bl7.pages.dev/'
// );
export const dataTrackerLink = readable('https://explore.openelectricity.org.au/');

export const bannerOpen = writable(fromLocalStorage('bannerOpen', true));
toLocalStorage(bannerOpen, 'bannerOpen');
