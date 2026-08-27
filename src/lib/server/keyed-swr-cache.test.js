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

describe('lifecycle hooks', () => {
	it('fires onStored after a successful edge write with the entry metadata', async () => {
		const { store, waited, platform } = fakePlatform();
		const onStored = vi.fn();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX, onStored });
		const fetcher = vi.fn(async () => ({ n: 1 }));

		await cache.get(platform, 'a=1', fetcher, FRESH);
		await Promise.all(waited.splice(0));

		expect(store.has(`${PREFIX}?a=1`)).toBe(true);
		expect(onStored).toHaveBeenCalledTimes(1);
		const info = onStored.mock.calls[0][0];
		expect(info.platform).toBe(platform);
		expect(info.key).toBe('a=1');
		expect(info.storedAt).toBeTypeOf('number');
		expect(info.durationMs).toBeGreaterThanOrEqual(0);
		// Exact UTF-8 byte length of the serialised value.
		expect(info.sizeBytes).toBe(new TextEncoder().encode(JSON.stringify({ n: 1 })).byteLength);
	});

	it('does not fire onStored for uncacheable values', async () => {
		const { store, waited, platform } = fakePlatform();
		const onStored = vi.fn();
		const cache = createKeyedSwrCache({
			keyPrefix: PREFIX,
			isCacheable: () => false,
			onStored
		});

		await cache.get(platform, 'a=1', async () => ({ empty: true }), FRESH);
		await Promise.all(waited.splice(0));
		expect(store.size).toBe(0);
		expect(onStored).not.toHaveBeenCalled();
	});

	it('does not fire onStored when the cache write fails', async () => {
		const { waited, platform } = fakePlatform();
		platform.caches = /** @type {any} */ ({
			default: {
				match: async () => undefined,
				put: async () => {
					throw new Error('cache broken');
				}
			}
		});
		const onStored = vi.fn();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX, onStored });

		await cache.get(platform, 'a=1', async () => ({ n: 1 }), FRESH);
		await Promise.all(waited.splice(0));
		expect(onStored).not.toHaveBeenCalled();
	});

	it('does not fire onStored without a cache binding', async () => {
		const onStored = vi.fn();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX, onStored });

		const result = await cache.refresh(undefined, 'a=1', async () => ({ n: 1 }));
		expect(result.value).toEqual({ n: 1 });
		expect(result.stored).toBe(false);
		expect(onStored).not.toHaveBeenCalled();
	});

	it('a throwing onStored hook never affects the response', async () => {
		const { store, waited, platform } = fakePlatform();
		const cache = createKeyedSwrCache({
			keyPrefix: PREFIX,
			onStored: async () => {
				throw new Error('registry down');
			}
		});

		const miss = await cache.get(platform, 'a=1', async () => ({ n: 1 }), FRESH);
		expect(miss).toEqual({ value: { n: 1 }, status: 'miss' });
		// Draining rejects if the hook failure leaked out of the write chain.
		await Promise.all(waited.splice(0));
		expect(store.has(`${PREFIX}?a=1`)).toBe(true);

		const hit = await cache.get(platform, 'a=1', async () => ({ n: 1 }), FRESH);
		expect(hit.status).toBe('hit');
	});

	it('fires onRefreshError on a cold-miss failure and still propagates the error', async () => {
		const { waited, platform } = fakePlatform();
		const onRefreshError = vi.fn();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX, onRefreshError });

		await expect(
			cache.get(
				platform,
				'a=1',
				async () => {
					throw new Error('upstream down');
				},
				FRESH
			)
		).rejects.toThrow('upstream down');
		await Promise.all(waited.splice(0));

		expect(onRefreshError).toHaveBeenCalledTimes(1);
		const info = onRefreshError.mock.calls[0][0];
		expect(info.key).toBe('a=1');
		expect(/** @type {Error} */ (info.error).message).toBe('upstream down');
		expect(info.durationMs).toBeGreaterThanOrEqual(0);
	});

	it('fires onRefreshError when a background stale refresh fails', async () => {
		vi.useFakeTimers();
		try {
			const { platform, waited } = fakePlatform();
			const onRefreshError = vi.fn();
			const cache = createKeyedSwrCache({ keyPrefix: PREFIX, onRefreshError });
			const fetcher = vi
				.fn(async () => ({ n: 1 }))
				.mockImplementationOnce(async () => ({ n: 1 }))
				.mockImplementationOnce(async () => {
					throw new Error('upstream down');
				});

			await cache.get(platform, 'a=1', fetcher, FRESH);
			await Promise.all(waited.splice(0));

			vi.advanceTimersByTime(FRESH.freshMs + 1000);
			const stale = await cache.get(platform, 'a=1', fetcher, FRESH);
			expect(stale.status).toBe('stale'); // The failure never reaches the caller.
			await Promise.all(waited.splice(0));

			expect(onRefreshError).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('peek and refresh', () => {
	it('peek returns the stored entry without populating on a miss', async () => {
		const { store, waited, platform } = fakePlatform();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX });

		expect(await cache.peek(platform, 'a=1')).toBeNull();
		expect(store.size).toBe(0); // A miss never writes.

		await cache.get(platform, 'a=1', async () => ({ n: 1 }), FRESH);
		await Promise.all(waited.splice(0));

		const peeked = await cache.peek(platform, 'a=1');
		expect(peeked?.value).toEqual({ n: 1 });
		expect(peeked?.storedAt).toBeTypeOf('number');
		expect(peeked?.sizeBytes).toBe(new TextEncoder().encode(JSON.stringify({ n: 1 })).byteLength);
	});

	it('refresh replaces the entry before resolving and reports metadata', async () => {
		const { store, waited, platform } = fakePlatform();
		const onStored = vi.fn();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX, onStored });

		const result = await cache.refresh(platform, 'a=1', async () => ({ n: 2 }));
		// No waitUntil drain: the entry and hook settled before resolution.
		expect(store.has(`${PREFIX}?a=1`)).toBe(true);
		expect(onStored).toHaveBeenCalledTimes(1);
		expect(result.stored).toBe(true);
		expect(result.value).toEqual({ n: 2 });
		expect(result.sizeBytes).toBeGreaterThan(0);

		const hit = await cache.get(
			platform,
			'a=1',
			async () => {
				throw new Error('should not fetch');
			},
			FRESH
		);
		expect(hit).toEqual({ value: { n: 2 }, status: 'hit' });
		void waited;
	});

	it('refresh shares in-flight de-duplication with get', async () => {
		const { platform } = fakePlatform();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX });
		/** @type {(value: any) => void} */
		let release = () => {};
		const fetcher = vi.fn(
			() =>
				new Promise((resolve) => {
					release = resolve;
				})
		);

		const refreshing = cache.refresh(platform, 'a=1', fetcher);
		const getting = cache.get(platform, 'a=1', fetcher, FRESH);
		release({ n: 3 });

		const [refreshed, got] = await Promise.all([refreshing, getting]);
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(refreshed.value).toEqual({ n: 3 });
		expect(got.value).toEqual({ n: 3 });
	});

	it('refresh rejects on upstream failure and leaves the existing entry intact', async () => {
		const { waited, platform } = fakePlatform();
		const cache = createKeyedSwrCache({ keyPrefix: PREFIX });

		await cache.get(platform, 'a=1', async () => ({ n: 1 }), FRESH);
		await Promise.all(waited.splice(0));

		await expect(
			cache.refresh(platform, 'a=1', async () => {
				throw new Error('upstream down');
			})
		).rejects.toThrow('upstream down');

		const peeked = await cache.peek(platform, 'a=1');
		expect(peeked?.value).toEqual({ n: 1 });
	});
});
