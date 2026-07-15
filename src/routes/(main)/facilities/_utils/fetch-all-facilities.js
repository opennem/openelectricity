/**
 * Client-side fetch for the full facilities dataset used by the map's play
 * (year animation) mode. Caches the in-flight/settled promise at module level
 * so repeated plays share one request, but drops it on failure or an empty
 * result so the next attempt retries instead of pinning the error.
 */

/** @type {Promise<any[] | null> | null} */
let allFacilitiesPromise = null;

/**
 * @returns {Promise<any[] | null>} the processed facilities, or null on failure
 */
export function fetchAllFacilities() {
	if (!allFacilitiesPromise) {
		allFacilitiesPromise = fetch('/api/facilities/all')
			.then((res) => (res.ok ? res.json() : null))
			.catch(() => null)
			.then((data) => {
				if (!Array.isArray(data) || data.length === 0) {
					allFacilitiesPromise = null;
					return null;
				}
				return data;
			});
	}
	return allFacilitiesPromise;
}
