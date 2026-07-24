/**
 * Lazy client-side cache for the full facilities dataset, shared by all three
 * tracker-map prototypes.
 *
 * `/api/facilities/all` returns every operating/commissioning facility with
 * units — a large array fetched once per session on the first prototype that
 * needs it and shared by the map layers and dock lists. The array is
 * deliberately kept out of any deep `$state` proxy: each page holds it in
 * `$state.raw` and components receive it as a plain prop.
 */

/** @type {any[] | null} */
let cached = null;

/** @type {Promise<any[]> | null} */
let inflight = null;

/**
 * Fetch the full facilities list, memoised for the session. Concurrent calls
 * share one request; a failed fetch clears the slot so a later flip retries.
 * @returns {Promise<any[]>}
 */
export function fetchAllFacilities() {
	if (cached) return Promise.resolve(cached);
	if (!inflight) {
		inflight = fetch('/api/facilities/all')
			.then((res) => {
				if (!res.ok) throw new Error(`Facilities fetch failed (${res.status})`);
				return res.json();
			})
			.then((data) => {
				cached = Array.isArray(data) ? data : [];
				return cached;
			})
			.finally(() => {
				inflight = null;
			});
	}
	return inflight;
}
