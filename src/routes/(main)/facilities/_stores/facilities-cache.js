import { writable, get } from 'svelte/store';

/**
 * Generate cache key from filter params
 * @param {{ statuses: string[], regions: string[], fuelTechs: string[] }} params
 * @returns {string}
 */
export function getCacheKey(params) {
	const s = [...params.statuses].sort().join(',');
	const r = [...params.regions].sort().join(',');
	const f = [...params.fuelTechs].sort().join(',');
	return `${s}|${r}|${f}`;
}

/**
 * Check if filter params require a refetch
 * @param {{ statuses: string[], regions: string[], fuelTechs: string[] }} oldParams
 * @param {{ statuses: string[], regions: string[], fuelTechs: string[] }} newParams
 * @returns {boolean}
 */
export function shouldRefetch(oldParams, newParams) {
	return getCacheKey(oldParams) !== getCacheKey(newParams);
}

/** @type {import('svelte/store').Writable<Map<string, any[]>>} */
const cache = writable(new Map());

/** @type {import('svelte/store').Writable<string>} */
const currentKey = writable('');

/**
 * Get cached facilities for given params
 * @param {{ statuses: string[], regions: string[], fuelTechs: string[] }} params
 * @returns {any[] | null}
 */
export function getCachedFacilities(params) {
	const key = getCacheKey(params);
	const cacheMap = get(cache);
	return cacheMap.get(key) || null;
}

/**
 * Store facilities in cache
 * @param {{ statuses: string[], regions: string[], fuelTechs: string[] }} params
 * @param {any[]} facilities
 */
export function setCachedFacilities(params, facilities) {
	const key = getCacheKey(params);
	cache.update((map) => {
		map.set(key, facilities);
		return map;
	});
	currentKey.set(key);
}

/**
 * Clear all cached data
 */
export function clearCache() {
	cache.set(new Map());
	currentKey.set('');
}

export { cache, currentKey };
