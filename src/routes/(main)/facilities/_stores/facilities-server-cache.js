/**
 * Server-side Cache for Facilities Data
 * ======================================
 *
 * This module provides an in-memory cache for facilities data fetched from the
 * OpenElectricity API. The cache runs on the server to avoid the SvelteKit warning
 * about using `window.fetch` instead of the load function's `fetch`.
 *
 * How it works:
 * -------------
 * 1. Cache keys are generated from filter parameters (statuses, regions, fuelTechs)
 * 2. Parameters are sorted before key generation to ensure consistent keys regardless
 *    of array order (e.g., ['nsw', 'vic'] and ['vic', 'nsw'] produce the same key)
 * 3. Each cached entry has a timestamp for TTL-based expiration
 * 4. Expired entries are lazily deleted when accessed
 *
 * Cache key format: "status1,status2|region1,region2|fuelTech1,fuelTech2"
 * Example: "commissioning,operating|nsw,vic|solar_utility,wind"
 *
 * Deployment considerations:
 * --------------------------
 * - Development: Cache persists for the server's lifetime (works well)
 * - Production (Cloudflare): Cache may not persist across edge worker instances.
 *   For production, consider using Cloudflare KV or relying on API-level caching.
 *
 * Usage in +page.server.js:
 * -------------------------
 * ```js
 * import { getCachedFacilities, setCachedFacilities } from './_stores/facilities-server-cache.js';
 *
 * const filterParams = { statuses, regions, fuelTechs };
 * const cached = getCachedFacilities(filterParams);
 * if (cached) return { facilities: cached, fromCache: true };
 *
 * // ... fetch from API ...
 *
 * setCachedFacilities(filterParams, facilities);
 * ```
 */

/** @type {Map<string, { data: any[], timestamp: number }>} */
const cache = new Map();

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL = 5 * 60 * 1000;

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

/**
 * Get cached facilities for given params
 * @param {{ statuses: string[], regions: string[], fuelTechs: string[] }} params
 * @returns {any[] | null}
 */
export function getCachedFacilities(params) {
	const key = getCacheKey(params);
	const cached = cache.get(key);

	if (!cached) {
		return null;
	}

	// Check if cache has expired
	if (Date.now() - cached.timestamp > CACHE_TTL) {
		cache.delete(key);
		return null;
	}

	return cached.data;
}

/**
 * Store facilities in cache
 * @param {{ statuses: string[], regions: string[], fuelTechs: string[] }} params
 * @param {any[]} facilities
 */
export function setCachedFacilities(params, facilities) {
	const key = getCacheKey(params);
	cache.set(key, {
		data: facilities,
		timestamp: Date.now()
	});
}

/**
 * Clear all cached data
 */
export function clearCache() {
	cache.clear();
}
