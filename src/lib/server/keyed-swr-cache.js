/**
 * Keyed stale-while-revalidate cache backed by Cloudflare's Cache API.
 * Concurrent requests share one fetch. Without a platform, every call fetches.
 */

/** Edge retention; the stored-at header determines freshness. */
const EDGE_MAX_AGE_S = 7 * 24 * 60 * 60;
const STORED_AT_HEADER = 'x-stored-at';

/**
 * @template T
 * @param {object} config
 * @param {string} config.keyPrefix - Synthetic URL prefix for Cache API keys
 * @param {(value: T) => boolean} [config.isCacheable] - Whether to store a value
 * @returns {{
 *   get: (
 *     platform: App.Platform | undefined,
 *     key: string,
 *     fetcher: () => Promise<T>,
 *     opts: { freshMs: number }
 *   ) => Promise<{ value: T, status: 'hit' | 'stale' | 'miss' }>
 * }}
 */
export function createKeyedSwrCache({ keyPrefix, isCacheable = () => true }) {
	/** @type {Map<string, Promise<T>>} */
	const inflight = new Map();

	/** @param {string} key */
	const edgeKeyFor = (key) => `${keyPrefix}?${key}`;

	/**
	 * @param {App.Platform | undefined} platform
	 * @param {string} edgeKey
	 * @returns {Promise<{ value: T, storedAt: number } | null>}
	 */
	async function readEdgeCache(platform, edgeKey) {
		try {
			const hit = await platform?.caches?.default?.match(edgeKey);
			if (!hit) return null;
			return {
				value: await hit.json(),
				// A missing timestamp serves stale and refreshes immediately.
				storedAt: Number(hit.headers.get(STORED_AT_HEADER)) || 0
			};
		} catch {
			return null;
		}
	}

	/**
	 * @param {App.Platform | undefined} platform
	 * @param {string} edgeKey
	 * @param {T} value
	 * @param {number} storedAt
	 */
	async function writeEdgeCache(platform, edgeKey, value, storedAt) {
		try {
			await platform?.caches?.default?.put(
				edgeKey,
				new Response(JSON.stringify(value), {
					headers: {
						'content-type': 'application/json',
						'cache-control': `public, max-age=${EDGE_MAX_AGE_S}`,
						[STORED_AT_HEADER]: String(storedAt)
					}
				})
			);
		} catch {
			// Cache writes are best-effort.
		}
	}

	/**
	 * Fetch and cache one value, sharing concurrent requests for the same key.
	 *
	 * @param {App.Platform | undefined} platform
	 * @param {string} key
	 * @param {() => Promise<T>} fetcher
	 * @returns {Promise<T>}
	 */
	function refresh(platform, key, fetcher) {
		let pending = inflight.get(key);
		if (pending) return pending;

		pending = fetcher()
			.then((value) => {
				if (isCacheable(value)) {
					// Let waitUntil finish the cache write after the response.
					const edgeWrite = writeEdgeCache(platform, edgeKeyFor(key), value, Date.now());
					platform?.context?.waitUntil?.(edgeWrite);
				}
				return value;
			})
			.finally(() => {
				inflight.delete(key);
			});

		inflight.set(key, pending);
		return pending;
	}

	return {
		/**
		 * Return a cached value, refreshing stale entries in the background.
		 *
		 * @param {App.Platform | undefined} platform
		 * @param {string} key
		 * @param {() => Promise<T>} fetcher
		 * @param {{ freshMs: number }} opts
		 * @returns {Promise<{ value: T, status: 'hit' | 'stale' | 'miss' }>}
		 */
		async get(platform, key, fetcher, { freshMs }) {
			const hit = await readEdgeCache(platform, edgeKeyFor(key));
			if (!hit) {
				return { value: await refresh(platform, key, fetcher), status: 'miss' };
			}
			if (Date.now() - hit.storedAt > freshMs) {
				const pending = refresh(platform, key, fetcher).catch(() => {});
				// Keep the background refresh alive after the response.
				platform?.context?.waitUntil?.(pending);
				return { value: hit.value, status: 'stale' };
			}
			return { value: hit.value, status: 'hit' };
		}
	};
}
