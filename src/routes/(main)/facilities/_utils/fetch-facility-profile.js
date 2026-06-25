/**
 * Client-side fetch of a facility's editorial profile (description, photos,
 * external links, owners, unit garnishes) from the profile endpoint. Results are
 * memoised per code for the lifetime of the page so re-selecting a facility is
 * instant and never re-hits the network.
 *
 * @type {Map<string, any>}
 */
const cache = new Map();

/**
 * @param {string} code
 * @param {typeof fetch} [fetchFn] - optional fetch (e.g. SvelteKit's load fetch)
 * @returns {Promise<any | null>}
 */
export async function fetchFacilityProfile(code, fetchFn = fetch) {
	if (cache.has(code)) return cache.get(code);
	try {
		const res = await fetchFn(`/api/facility/${code}/profile`);
		const profile = res.ok ? await res.json() : null;
		cache.set(code, profile);
		return profile;
	} catch {
		return null;
	}
}

/**
 * Synchronous cache peek — returns the profile if already fetched, else
 * `undefined`. Lets the panel render cached data on the first paint without a
 * loading flash.
 * @param {string} code
 */
export function peekFacilityProfile(code) {
	return cache.get(code);
}
