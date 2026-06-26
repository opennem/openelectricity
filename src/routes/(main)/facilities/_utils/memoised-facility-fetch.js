/**
 * Factory for a per-code memoised client-side fetcher. Used by the facility
 * profile and full-facility loaders, which only differ in their endpoint URL:
 * both fetch once per code, cache the result (including `null` on miss/error)
 * for the lifetime of the page, and expose a synchronous `peek` so the detail
 * panel can render cached data on the first paint without a loading flash.
 *
 * @param {(code: string) => string} buildUrl - endpoint URL for a facility code
 * @returns {{
 *   fetch: (code: string, fetchFn?: typeof fetch) => Promise<any | null>,
 *   peek: (code: string) => any
 * }}
 */
export function createMemoisedFacilityFetch(buildUrl) {
	/** @type {Map<string, any>} */
	const cache = new Map();

	/**
	 * @param {string} code
	 * @param {typeof fetch} [fetchFn] - optional fetch (e.g. SvelteKit's load fetch)
	 * @returns {Promise<any | null>}
	 */
	async function fetchValue(code, fetchFn = fetch) {
		if (cache.has(code)) return cache.get(code);
		try {
			const res = await fetchFn(buildUrl(code));
			const value = res.ok ? await res.json() : null;
			cache.set(code, value);
			return value;
		} catch {
			return null;
		}
	}

	/**
	 * Synchronous cache peek — returns the value if already fetched, else
	 * `undefined`.
	 * @param {string} code
	 */
	function peek(code) {
		return cache.get(code);
	}

	return { fetch: fetchValue, peek };
}
