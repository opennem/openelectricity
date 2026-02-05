import { readable, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_EXPLORE_URL, PUBLIC_FEATURE_FLAGS } from '$env/static/public';

console.log('PUBLIC_FEATURE_FLAGS', JSON.parse(PUBLIC_FEATURE_FLAGS));

export const parsedFeatureFlags = PUBLIC_FEATURE_FLAGS ? JSON.parse(PUBLIC_FEATURE_FLAGS) : {};
/** @type {import('svelte/store').Readable<*>} */
export const featureFlags = readable(parsedFeatureFlags);

// Get value from localStorage if in browser and the value is stored, otherwise fallback
/**
 * @param {string} storageKey
 * @param {any} fallbackValue
 */
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
/**
 * @param {import('svelte/store').Writable<any>} store
 * @param {string} storageKey
 */
function toLocalStorage(store, storageKey) {
	if (browser) {
		store.subscribe((/** @type {any} */ value) => {
			let storageValue = typeof value === 'object' ? JSON.stringify(value) : value;

			window.localStorage.setItem(storageKey, storageValue);
		});
	}
}

/** @type {import('svelte/store').Readable<string>} */
export const dataTrackerLink = readable(PUBLIC_EXPLORE_URL);

export const bannerOpen = writable(fromLocalStorage('bannerOpen', true));
toLocalStorage(bannerOpen, 'bannerOpen');
