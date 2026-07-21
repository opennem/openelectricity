import { describe, it, expect, vi } from 'vitest';
import { createSwrCache } from './swr-cache.js';

const KEY = 'https://cache.example.com/internal/test-v1';

/** A fake Cloudflare platform: Cache API backed by a Map, waitUntil collected. */
function fakePlatform() {
	/** @type {Map<string, Response>} */
	const store = new Map();
	/** @type {Promise<unknown>[]} */
	const waited = [];
	return {
		store,
		waited,
		platform: /** @type {App.Platform} */ ({
			caches: {
				default: {
					match: async (/** @type {string} */ key) => {
						const hit = store.get(key);
						return hit ? hit.clone() : undefined;
					},
					put: async (/** @type {string} */ key, /** @type {Response} */ res) => {
						store.set(key, res);
					}
				}
			},
			context: { waitUntil: (/** @type {Promise<unknown>} */ p) => waited.push(p) }
		})
	};
}

/**
 * @param {Partial<Parameters<typeof createSwrCache>[0]>} [overrides]
 */
function makeCache(overrides = {}) {
	const fetcher = vi.fn(async () => ({ n: fetcher.mock.calls.length }));
	const cache = createSwrCache({
		edgeCacheKey: KEY,
		fetcher,
		isFresh: () => true,
		isCacheable: () => true,
		...overrides
	});
	return { cache, fetcher };
}

describe('createSwrCache', () => {
	it('fetches on a cold miss and serves memory on subsequent gets', async () => {
		const { cache, fetcher } = makeCache();
		expect(await cache.get(undefined)).toEqual({ n: 1 });
		expect(await cache.get(undefined)).toEqual({ n: 1 });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('single-flights concurrent cold gets', async () => {
		const { cache, fetcher } = makeCache();
		const [a, b] = await Promise.all([cache.get(undefined), cache.get(undefined)]);
		expect(a).toEqual({ n: 1 });
		expect(b).toEqual({ n: 1 });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('serves stale immediately and refreshes in the background', async () => {
		const { cache, fetcher } = makeCache({ isFresh: () => false });
		const { platform, waited } = fakePlatform();

		expect(await cache.get(platform)).toEqual({ n: 1 });
		// Stale hit: old value served synchronously, refresh registered via waitUntil.
		expect(await cache.get(platform)).toEqual({ n: 1 });
		expect(waited.length).toBeGreaterThan(0);
		await Promise.all(waited);
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(await cache.get(platform)).toEqual({ n: 2 });
	});

	it('never stores uncacheable values', async () => {
		const { cache, fetcher } = makeCache({ isCacheable: () => false });
		expect(await cache.get(undefined)).toEqual({ n: 1 });
		expect(await cache.get(undefined)).toEqual({ n: 2 });
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('keeps serving the last good value when the fetcher degrades', async () => {
		let healthy = true;
		const fetcher = vi.fn(async () => (healthy ? { ok: true } : { error: 'boom' }));
		const cache = createSwrCache({
			edgeCacheKey: KEY,
			fetcher,
			isFresh: () => false,
			isCacheable: (/** @type {any} */ v) => !v.error
		});

		expect(await cache.get(undefined)).toEqual({ ok: true });
		healthy = false;
		// Stale → background refresh returns an error envelope → not stored,
		// last good value keeps being served.
		expect(await cache.get(undefined)).toEqual({ ok: true });
		await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
		expect(await cache.get(undefined)).toEqual({ ok: true });
	});

	it('writes the edge cache and reads it back on a cold isolate', async () => {
		const { store, platform, waited } = fakePlatform();

		const first = makeCache();
		expect(await first.cache.get(platform)).toEqual({ n: 1 });
		await Promise.all(waited);
		expect(store.has(KEY)).toBe(true);

		// A "new isolate": fresh factory instance, same colo cache.
		const second = makeCache();
		expect(await second.cache.get(platform)).toEqual({ n: 1 });
		expect(second.fetcher).not.toHaveBeenCalled();
	});

	it('treats an edge entry with a missing stored-at header as stale but servable', async () => {
		const { store, platform, waited } = fakePlatform();
		store.set(
			KEY,
			new Response(JSON.stringify({ seeded: true }), {
				headers: { 'content-type': 'application/json' }
			})
		);

		const { cache, fetcher } = makeCache({
			isFresh: (/** @type {any} */ _v, /** @type {number} */ storedAt) => storedAt > 0
		});
		expect(await cache.get(platform)).toEqual({ seeded: true });
		await Promise.all(waited);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('survives a broken Cache API', async () => {
		const platform = /** @type {App.Platform} */ ({
			caches: {
				default: {
					match: async () => {
						throw new Error('cache down');
					},
					put: async () => {
						throw new Error('cache down');
					}
				}
			}
		});
		const { cache } = makeCache();
		expect(await cache.get(platform)).toEqual({ n: 1 });
	});
});
