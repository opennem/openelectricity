import { describe, it, expect, vi } from 'vitest';
import { createKeyedSwrCache } from './keyed-swr-cache.js';

const PREFIX = 'https://cache.example.com/internal/keyed-test-v1';

/** Fake Cloudflare cache and waitUntil collector. */
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

const FRESH = { freshMs: 5 * 60 * 1000 };

describe('createKeyedSwrCache', () => {
	it('fetches on a cold miss, stores at the edge, then serves hits without the fetcher', async () => {
		const { store, waited, platform } = fakePlatform();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX });
		const fetcher = vi.fn(async () => ({ n: 1 }));

		const miss = await cache.get(platform, 'a=1', fetcher, FRESH);
		expect(miss).toEqual({ value: { n: 1 }, status: 'miss' });
		await Promise.all(waited);
		expect(store.has(`${PREFIX}?a=1`)).toBe(true);

		const hit = await cache.get(platform, 'a=1', fetcher, FRESH);
		expect(hit).toEqual({ value: { n: 1 }, status: 'hit' });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('keys entries independently', async () => {
		const { platform, waited } = fakePlatform();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX });
		const fetcher = vi.fn(async () => ({}));

		await cache.get(platform, 'a=1', fetcher, FRESH);
		await Promise.all(waited);
		await cache.get(platform, 'a=2', fetcher, FRESH);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('serves a stale hit instantly and refreshes in the background', async () => {
		vi.useFakeTimers();
		try {
			const { platform, waited } = fakePlatform();
			const cache = createKeyedSwrCache({ keyPrefix: PREFIX });
			let n = 0;
			const fetcher = vi.fn(async () => ({ n: ++n }));

			await cache.get(platform, 'a=1', fetcher, FRESH);
			await Promise.all(waited.splice(0));

			vi.advanceTimersByTime(FRESH.freshMs + 1000);
			const stale = await cache.get(platform, 'a=1', fetcher, FRESH);
			expect(stale).toEqual({ value: { n: 1 }, status: 'stale' });
			expect(fetcher).toHaveBeenCalledTimes(2); // A refresh started in the background.
			await Promise.all(waited.splice(0));

			const hit = await cache.get(platform, 'a=1', fetcher, FRESH);
			expect(hit).toEqual({ value: { n: 2 }, status: 'hit' });
		} finally {
			vi.useRealTimers();
		}
	});

	it('single-flights concurrent cold misses per key', async () => {
		const { platform } = fakePlatform();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX });
		const fetcher = vi.fn(async () => ({}));

		await Promise.all([
			cache.get(platform, 'a=1', fetcher, FRESH),
			cache.get(platform, 'a=1', fetcher, FRESH)
		]);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('propagates cold-miss rejections and caches nothing', async () => {
		const { store, platform } = fakePlatform();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX });
		const fetcher = vi.fn(
			/** @type {() => Promise<any>} */ (
				async () => {
					throw new Error('upstream down');
				}
			)
		);

		await expect(cache.get(platform, 'a=1', fetcher, FRESH)).rejects.toThrow('upstream down');
		expect(store.size).toBe(0);

		// Failures do not block a later retry.
		fetcher.mockResolvedValueOnce(/** @type {any} */ ({ ok: true }));
		const retry = await cache.get(platform, 'a=1', fetcher, FRESH);
		expect(retry.status).toBe('miss');
	});

	it('respects isCacheable — uncacheable values are returned but never stored', async () => {
		const { store, waited, platform } = fakePlatform();
		const cache = createKeyedSwrCache({
			keyPrefix: PREFIX,
			isCacheable: (/** @type {any} */ v) => !v.empty
		});
		const fetcher = vi.fn(async () => ({ empty: true }));

		const first = await cache.get(platform, 'a=1', fetcher, FRESH);
		expect(first.value).toEqual({ empty: true });
		await Promise.all(waited);
		expect(store.size).toBe(0);
	});

	it('degrades to a plain fetch without a platform (vite dev)', async () => {
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX });
		const fetcher = vi.fn(async () => ({ dev: true }));

		expect(await cache.get(undefined, 'a=1', fetcher, FRESH)).toEqual({
			value: { dev: true },
			status: 'miss'
		});
		expect(await cache.get(undefined, 'a=1', fetcher, FRESH)).toEqual({
			value: { dev: true },
			status: 'miss'
		});
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});
