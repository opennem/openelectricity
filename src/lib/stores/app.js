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

const BANNER_STORAGE_KEY = 'bannerDismissedAt';
const BANNER_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 1 month

function isBannerOpen() {
	if (browser) {
		const dismissedAt = window.localStorage.getItem(BANNER_STORAGE_KEY);
		if (dismissedAt) {
			const elapsed = Date.now() - Number(dismissedAt);
			if (elapsed < BANNER_EXPIRY_MS) return false;
			window.localStorage.removeItem(BANNER_STORAGE_KEY);
		}
	}
	return true;
}

export const bannerOpen = writable(isBannerOpen());

if (browser) {
	bannerOpen.subscribe((/** @type {boolean} */ value) => {
		if (!value) {
			window.localStorage.setItem(BANNER_STORAGE_KEY, String(Date.now()));
		} else {
			window.localStorage.removeItem(BANNER_STORAGE_KEY);
		}
	});
}
