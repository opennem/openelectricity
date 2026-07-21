/**
 * Generic stale-while-revalidate cache for server-side fetches on Cloudflare.
 *
 * SvelteKit load() calls internal fetches in-process, so HTTP cache-control
 * never reaches the Cloudflare edge cache — caching has to wrap the fetch
 * itself. Two tiers: a module-scope copy (instant within an isolate) and the
 * Cloudflare Cache API (survives isolate recycling, shared per-colo, needs no
 * bindings). Both degrade to nothing in `vite dev`, where `platform` is
 * undefined.
 *
 * Semantics: always serve what we have immediately; refresh stale entries in
 * the background via `waitUntil`; single-flight concurrent refreshes; never
 * store values the caller marks uncacheable (e.g. error envelopes); keep
 * serving the last good value when the fetcher returns an uncacheable one.
 */

/** Edge retention only — freshness is decided in code via the stored-at header. */
const EDGE_MAX_AGE_S = 7 * 24 * 60 * 60;
const STORED_AT_HEADER = 'x-stored-at';

/**
 * @template T
 * @param {object} config
 * @param {string} config.edgeCacheKey stable synthetic http(s) URL the Cache
 *   API files the entry under (never actually fetched)
 * @param {() => Promise<T>} config.fetcher performs the upstream work;
 *   expected to resolve with an error envelope rather than throw
 * @param {(value: T, storedAt: number) => boolean} config.isFresh whether a
 *   cached value still needs no background refresh
 * @param {(value: T) => boolean} config.isCacheable whether a fetched value
 *   may be stored (return false for error envelopes so they are never cached)
 * @returns {{ get: (platform: App.Platform | undefined) => Promise<T> }}
 */
export function createSwrCache({ edgeCacheKey, fetcher, isFresh, isCacheable }) {
	/** @type {{ value: T, storedAt: number } | null} */
	let memory = null;

	/** @type {Promise<T> | null} */
	let inflight = null;

	/**
	 * @param {App.Platform | undefined} platform
	 * @returns {Promise<{ value: T, storedAt: number } | null>}
	 */
	async function readEdgeCache(platform) {
		try {
			const hit = await platform?.caches?.default?.match(edgeCacheKey);
			if (!hit) return null;
			return {
				value: await hit.json(),
				// A missing header parses to 0 → treated as maximally stale: still
				// served, but a background refresh is scheduled immediately.
				storedAt: Number(hit.headers.get(STORED_AT_HEADER)) || 0
			};
		} catch {
			return null;
		}
	}

	/**
	 * @param {App.Platform | undefined} platform
	 * @param {T} value
	 * @param {number} storedAt
	 */
	async function writeEdgeCache(platform, value, storedAt) {
		try {
			await platform?.caches?.default?.put(
				edgeCacheKey,
				new Response(JSON.stringify(value), {
					headers: {
						'content-type': 'application/json',
						'cache-control': `public, max-age=${EDGE_MAX_AGE_S}`,
						[STORED_AT_HEADER]: String(storedAt)
					}
				})
			);
		} catch {
			// Edge cache is best-effort — the memory tier still holds the value.
		}
	}

	/**
	 * Fetch upstream and cache the result. Single-flight: concurrent callers
	 * share one fetch. Uncacheable results fall back to the last good value.
	 *
	 * @param {App.Platform | undefined} platform
	 * @returns {Promise<T>}
	 */
	function refresh(platform) {
		if (inflight) return inflight;

		inflight = fetcher()
			.then((value) => {
				if (isCacheable(value)) {
					const storedAt = Date.now();
					memory = { value, storedAt };
					// Not awaited — the caller shouldn't wait on the Cache API put;
					// waitUntil keeps it alive past the response (never rejects, the
					// helper catches internally).
					const edgeWrite = writeEdgeCache(platform, value, storedAt);
					platform?.context?.waitUntil?.(edgeWrite);
					return value;
				}
				return memory?.value ?? value;
			})
			.finally(() => {
				inflight = null;
			});

		return inflight;
	}

	/** @param {App.Platform | undefined} platform */
	function scheduleRefresh(platform) {
		const pending = refresh(platform).catch(() => {});
		// waitUntil keeps the Workers isolate alive past the response; in dev
		// (no platform) fire-and-forget under Node is fine.
		platform?.context?.waitUntil?.(pending);
	}

	return {
		/**
		 * Cached value, served stale-while-revalidate. Only a true cold miss
		 * (new isolate + nothing at the colo's edge cache) blocks on the fetcher;
		 * everything else returns immediately and refreshes in the background.
		 *
		 * @param {App.Platform | undefined} platform
		 * @returns {Promise<T>}
		 */
		async get(platform) {
			memory ??= await readEdgeCache(platform);
			if (!memory) return refresh(platform);

			if (!isFresh(memory.value, memory.storedAt)) scheduleRefresh(platform);
			return memory.value;
		}
	};
}
