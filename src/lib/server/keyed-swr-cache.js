/**
 * Keyed stale-while-revalidate cache backed by Cloudflare's Cache API.
 * Concurrent calls handled by the same isolate share one fetch. Without a
 * platform, every call fetches.
 *
 * Optional lifecycle hooks observe the cache without being able to break it:
 * `onStored` fires after a successful edge write and `onRefreshError` after a
 * failed fetch (cold miss, explicit refresh, or background refresh). Their
 * work is kept alive with `waitUntil`, and hook failures are isolated from the
 * caller. An explicit `refresh()` still awaits its edge write and `onStored`
 * hook so the admin endpoint can read its own write.
 */

import { EDGE_MAX_AGE_MS } from '$lib/network-cache/freshness.js';

/** Edge retention; the stored-at header determines freshness. */
const EDGE_MAX_AGE_S = EDGE_MAX_AGE_MS / 1000;
const STORED_AT_HEADER = 'x-stored-at';

/**
 * @template T
 * @param {object} config
 * @param {string} config.keyPrefix - Synthetic URL prefix for Cache API keys
 * @param {(value: T) => boolean} [config.isCacheable] - Whether to store a value
 * @param {(info: {
 *   platform: App.Platform | undefined,
 *   key: string,
 *   storedAt: number,
 *   sizeBytes: number,
 *   durationMs: number
 * }) => void | Promise<void>} [config.onStored] - After a successful edge write
 * @param {(info: {
 *   platform: App.Platform | undefined,
 *   key: string,
 *   error: unknown,
 *   durationMs: number
 * }) => void | Promise<void>} [config.onRefreshError] - After a failed fetch
 * @returns {{
 *   get: (
 *     platform: App.Platform | undefined,
 *     key: string,
 *     fetcher: () => Promise<T>,
 *     opts: { freshMs: number }
 *   ) => Promise<{ value: T, status: 'hit' | 'stale' | 'miss' }>,
 *   peek: (
 *     platform: App.Platform | undefined,
 *     key: string
 *   ) => Promise<{ value: T, storedAt: number, sizeBytes: number } | null>,
 *   refresh: (
 *     platform: App.Platform | undefined,
 *     key: string,
 *     fetcher: () => Promise<T>
 *   ) => Promise<{
 *     value: T,
 *     stored: boolean,
 *     storedAt: number | null,
 *     sizeBytes: number | null,
 *     durationMs: number | null
 *   }>
 * }}
 */
export function createKeyedSwrCache({
	keyPrefix,
	isCacheable = () => true,
	onStored,
	onRefreshError
}) {
	/**
	 * @typedef {{ storedAt: number, sizeBytes: number, durationMs: number, done: Promise<boolean> }} StoredInfo
	 */

	/** @type {Map<string, Promise<{ value: T, stored: StoredInfo | null }>>} */
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
	 * Write a pre-serialised body to the edge; report whether it stored.
	 *
	 * @param {App.Platform | undefined} platform
	 * @param {string} edgeKey
	 * @param {string} body
	 * @param {number} storedAt
	 * @returns {Promise<boolean>}
	 */
	async function writeEdgeCache(platform, edgeKey, body, storedAt) {
		const cache = platform?.caches?.default;
		if (!cache) return false;
		try {
			await cache.put(
				edgeKey,
				new Response(body, {
					headers: {
						'content-type': 'application/json',
						'cache-control': `public, max-age=${EDGE_MAX_AGE_S}`,
						[STORED_AT_HEADER]: String(storedAt)
					}
				})
			);
			return true;
		} catch {
			// Cache writes are best-effort.
			return false;
		}
	}

	/**
	 * Fetch and cache one value, sharing concurrent requests for the same key.
	 *
	 * @param {App.Platform | undefined} platform
	 * @param {string} key
	 * @param {() => Promise<T>} fetcher
	 * @returns {Promise<{ value: T, stored: StoredInfo | null }>}
	 */
	function runRefresh(platform, key, fetcher) {
		let pending = inflight.get(key);
		if (pending) return pending;

		const startedAt = Date.now();
		pending = fetcher()
			.then((value) => {
				const durationMs = Date.now() - startedAt;
				if (!isCacheable(value)) return { value, stored: null };
				// Serialise once: the same body backs the write and the size.
				const body = JSON.stringify(value);
				const sizeBytes = new TextEncoder().encode(body).byteLength;
				const storedAt = Date.now();
				const done = writeEdgeCache(platform, edgeKeyFor(key), body, storedAt).then(async (ok) => {
					if (ok && onStored) {
						await Promise.resolve(
							onStored({ platform, key, storedAt, sizeBytes, durationMs })
						).catch(() => {});
					}
					return ok;
				});
				// Keep the write alive after get() responds. refresh() also awaits
				// this same promise to provide read-your-own-write behaviour.
				platform?.context?.waitUntil?.(done);
				return { value, stored: { storedAt, sizeBytes, durationMs, done } };
			})
			.catch((error) => {
				if (onRefreshError) {
					const noted = Promise.resolve()
						.then(() =>
							onRefreshError({ platform, key, error, durationMs: Date.now() - startedAt })
						)
						.catch(() => {});
					platform?.context?.waitUntil?.(noted);
				}
				throw error;
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
				const { value } = await runRefresh(platform, key, fetcher);
				return { value, status: 'miss' };
			}
			if (Date.now() - hit.storedAt > freshMs) {
				const pending = runRefresh(platform, key, fetcher).catch(() => {});
				// Keep the background refresh alive after the response.
				platform?.context?.waitUntil?.(pending);
				return { value: hit.value, status: 'stale' };
			}
			return { value: hit.value, status: 'hit' };
		},

		/**
		 * Inspect this data centre's entry without populating on a miss.
		 *
		 * @param {App.Platform | undefined} platform
		 * @param {string} key
		 * @returns {Promise<{ value: T, storedAt: number, sizeBytes: number } | null>}
		 */
		async peek(platform, key) {
			try {
				const hit = await platform?.caches?.default?.match(edgeKeyFor(key));
				if (!hit) return null;
				// Read the body once; parse and measure from the same text.
				const body = await hit.text();
				return {
					value: JSON.parse(body),
					storedAt: Number(hit.headers.get(STORED_AT_HEADER)) || 0,
					sizeBytes: new TextEncoder().encode(body).byteLength
				};
			} catch {
				return null;
			}
		},

		/**
		 * Fetch upstream now and replace this data centre's entry, sharing
		 * in-flight de-duplication and lifecycle hooks with get(). Resolves
		 * only after the edge write (and onStored) settle, so callers can read
		 * their own write. Rejects on upstream failure, leaving any existing
		 * entry untouched.
		 *
		 * @param {App.Platform | undefined} platform
		 * @param {string} key
		 * @param {() => Promise<T>} fetcher
		 * @returns {Promise<{
		 *   value: T,
		 *   stored: boolean,
		 *   storedAt: number | null,
		 *   sizeBytes: number | null,
		 *   durationMs: number | null
		 * }>}
		 */
		async refresh(platform, key, fetcher) {
			const { value, stored } = await runRefresh(platform, key, fetcher);
			if (!stored)
				return { value, stored: false, storedAt: null, sizeBytes: null, durationMs: null };
			const ok = await stored.done;
			return {
				value,
				stored: ok,
				storedAt: stored.storedAt,
				sizeBytes: stored.sizeBytes,
				durationMs: stored.durationMs
			};
		}
	};
}
