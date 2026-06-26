/**
 * Client-side fetch of a facility's complete data (every unit, all fuel techs and
 * statuses) from the single-facility endpoint — independent of the /facilities
 * list filters. Lets the detail panel show the whole facility, matching the
 * dedicated /facility/[code] page, instead of only the filtered units. Results
 * are memoised per code for the lifetime of the page so re-selecting a facility
 * is instant and never re-hits the network.
 *
 * @type {Map<string, any>}
 */
const cache = new Map();

/**
 * @param {string} code
 * @param {typeof fetch} [fetchFn] - optional fetch (e.g. SvelteKit's load fetch)
 * @returns {Promise<any | null>}
 */
export async function fetchFacilityDetail(code, fetchFn = fetch) {
	if (cache.has(code)) return cache.get(code);
	try {
		const res = await fetchFn(`/api/facility/${code}`);
		const facility = res.ok ? await res.json() : null;
		cache.set(code, facility);
		return facility;
	} catch {
		return null;
	}
}

/**
 * Synchronous cache peek — returns the facility if already fetched, else
 * `undefined`. Lets the panel render the full facility on the first paint without
 * a swap when re-selecting.
 * @param {string} code
 */
export function peekFacilityDetail(code) {
	return cache.get(code);
}
