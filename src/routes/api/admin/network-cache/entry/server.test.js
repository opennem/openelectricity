import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	verifyAdmin: vi.fn(),
	getMarket: vi.fn(),
	getNetworkData: vi.fn()
}));

vi.mock('$lib/auth/clerk-server.js', () => ({ verifyAdmin: mocks.verifyAdmin }));
vi.mock('openelectricity', () => ({
	OpenElectricityClient: class {
		getMarket = mocks.getMarket;
		getNetworkData = mocks.getNetworkData;
	},
	NoDataFound: class NoDataFound extends Error {}
}));

import { GET } from './+server.js';

const ADMIN = { authenticated: true, isAdmin: true, isSuperAdmin: false, userId: 'user-1' };
const PREFIX = 'https://edge-cache.openelectricity.org.au/network-data-v1';
const CANONICAL = 'region=nsw1&metric=power&interval=5m';
const KEY = `${PREFIX}?${CANONICAL}`;

/** Fake Cloudflare cache, waitUntil collector and no-op D1 binding. */
function fakePlatform() {
	/** @type {Map<string, Response>} */
	const store = new Map();
	/** @type {Promise<unknown>[]} */
	const waited = [];
	const statement = /** @type {any} */ ({
		bind: () => statement,
		run: async () => {},
		first: async () => null,
		all: async () => ({ results: [] })
	});
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
			context: { waitUntil: (/** @type {Promise<unknown>} */ p) => waited.push(p) },
			env: { CACHE_REGISTRY: /** @type {any} */ ({ prepare: () => statement }) }
		})
	};
}

/**
 * @param {string | null} key
 * @param {any} platform
 */
function request(key, platform) {
	const url = new URL('https://example.test/api/admin/network-cache/entry');
	if (key !== null) url.searchParams.set('key', key);
	return GET(
		/** @type {any} */ ({
			request: new Request('https://example.test/api/admin/network-cache/entry'),
			url,
			platform
		})
	);
}

describe('admin network-cache entry endpoint', () => {
	beforeEach(() => {
		mocks.verifyAdmin.mockReset().mockResolvedValue(ADMIN);
		mocks.getMarket.mockReset();
		mocks.getNetworkData.mockReset();
	});

	it('rejects unauthenticated and non-admin callers', async () => {
		const { platform } = fakePlatform();
		mocks.verifyAdmin.mockResolvedValue({ authenticated: false, isAdmin: false });
		expect((await request(KEY, platform)).status).toBe(401);

		mocks.verifyAdmin.mockResolvedValue({ authenticated: true, isAdmin: false });
		expect((await request(KEY, platform)).status).toBe(403);
	});

	it('returns 503 when the registry binding is absent', async () => {
		expect((await request(KEY, {})).status).toBe(503);
	});

	it('rejects missing and malformed keys', async () => {
		const { platform } = fakePlatform();
		expect((await request(null, platform)).status).toBe(400);
		expect((await request('https://example.com/other?x=1', platform)).status).toBe(400);
		// Non-canonical parameter order is not a registered key.
		expect((await request(`${PREFIX}?metric=power&region=nsw1&interval=5m`, platform)).status).toBe(
			400
		);
	});

	it('reports a local miss without populating the cache or calling upstream', async () => {
		const { store, platform } = fakePlatform();
		const response = await request(KEY, platform);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ found: false, key: KEY });
		expect(store.size).toBe(0);
		expect(mocks.getMarket).not.toHaveBeenCalled();
		expect(mocks.getNetworkData).not.toHaveBeenCalled();
	});

	it('returns the complete payload and local freshness for a hit', async () => {
		const { store, platform } = fakePlatform();
		const payload = { region: 'nsw1', network_id: 'NEM', response: { data: [{ series: true }] } };
		const storedAt = Date.now() - 60_000;
		store.set(
			KEY,
			new Response(JSON.stringify(payload), {
				headers: { 'content-type': 'application/json', 'x-stored-at': String(storedAt) }
			})
		);

		const response = await request(KEY, platform);
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		const body = await response.json();
		expect(body).toMatchObject({
			found: true,
			key: KEY,
			value: payload,
			storedAt,
			status: 'fresh' // One minute old within the five-minute live window.
		});
		expect(body.sizeBytes).toBe(new TextEncoder().encode(JSON.stringify(payload)).byteLength);
		expect(body.freshUntil).toBe(storedAt + 5 * 60 * 1000);
	});

	it('surfaces a missing stored-at header as expired', async () => {
		const { store, platform } = fakePlatform();
		store.set(KEY, new Response(JSON.stringify({ data: [] })));

		const body = await (await request(KEY, platform)).json();
		expect(body.storedAt).toBe(0);
		expect(body.status).toBe('expired');
	});
});
