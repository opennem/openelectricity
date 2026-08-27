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

import { NoDataFound } from 'openelectricity';
import { POST } from './+server.js';

const ADMIN = { authenticated: true, isAdmin: true, isSuperAdmin: false, userId: 'user-1' };
const PREFIX = 'https://edge-cache.openelectricity.org.au/network-data-v1';
// Distinct keys per test keep the module-scope cache's entries independent.
/** @param {string} region */
const keyFor = (region) => `${PREFIX}?region=${region}&metric=power&interval=5m`;

const REGISTERED_ROW = { cache_key: 'set-per-test' };

/**
 * Fake Cloudflare cache, waitUntil collector and recording D1 binding.
 * @param {{ registered?: boolean }} [opts]
 */
function fakePlatform({ registered = true } = {}) {
	/** @type {Map<string, Response>} */
	const store = new Map();
	/** @type {Promise<unknown>[]} */
	const waited = [];
	/** @type {{ sql: string, params: unknown[] }[]} */
	const executed = [];
	/**
	 * @param {string} sql
	 * @param {unknown[]} params
	 * @returns {any}
	 */
	function statement(sql, params) {
		return {
			bind: (/** @type {unknown[]} */ ...values) => statement(sql, values),
			run: async () => {
				executed.push({ sql, params });
			},
			first: async () => {
				executed.push({ sql, params });
				return sql.includes('WHERE cache_key = ?1') && registered ? REGISTERED_ROW : null;
			},
			all: async () => {
				executed.push({ sql, params });
				return { results: [] };
			}
		};
	}
	return {
		store,
		waited,
		executed,
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
			env: {
				CACHE_REGISTRY: /** @type {any} */ ({
					prepare: (/** @type {string} */ sql) => statement(sql, [])
				})
			}
		})
	};
}

/**
 * @param {any} body
 * @param {any} platform
 */
function request(body, platform) {
	return POST(
		/** @type {any} */ ({
			request: new Request('https://example.test/api/admin/network-cache/refresh', {
				method: 'POST',
				body: typeof body === 'string' ? body : JSON.stringify(body),
				headers: { 'content-type': 'application/json' }
			}),
			platform
		})
	);
}

describe('admin network-cache refresh endpoint', () => {
	beforeEach(() => {
		mocks.verifyAdmin.mockReset().mockResolvedValue(ADMIN);
		mocks.getMarket.mockReset();
		mocks.getNetworkData.mockReset().mockResolvedValue({ response: { data: [{ fresh: true }] } });
	});

	it('rejects unauthenticated and non-admin callers', async () => {
		const { platform } = fakePlatform();
		mocks.verifyAdmin.mockResolvedValue({ authenticated: false, isAdmin: false });
		expect((await request({ key: keyFor('nsw1') }, platform)).status).toBe(401);

		mocks.verifyAdmin.mockResolvedValue({ authenticated: true, isAdmin: false });
		expect((await request({ key: keyFor('nsw1') }, platform)).status).toBe(403);
	});

	it('returns 503 when the registry binding is absent', async () => {
		expect((await request({ key: keyFor('nsw1') }, {})).status).toBe(503);
	});

	it('rejects malformed bodies and keys', async () => {
		const { platform } = fakePlatform();
		expect((await request('not json', platform)).status).toBe(400);
		expect((await request({}, platform)).status).toBe(400);
		expect((await request({ key: 'https://example.com/other?x=1' }, platform)).status).toBe(400);
	});

	it('returns 404 for keys not present in the registry', async () => {
		const { platform } = fakePlatform({ registered: false });
		const response = await request({ key: keyFor('nsw1') }, platform);
		expect(response.status).toBe(404);
		expect((await response.json()).error).toContain('not in the registry');
		expect(mocks.getNetworkData).not.toHaveBeenCalled();
	});

	it('replaces the local entry, updates the registry and returns the new payload', async () => {
		const { store, executed, platform } = fakePlatform();
		const key = keyFor('vic1');

		const response = await request({ key }, platform);
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		const body = await response.json();
		expect(body.ok).toBe(true);
		expect(body.stored).toBe(true);
		expect(body.value).toMatchObject({ region: 'vic1', network_id: 'NEM' });
		expect(body.storedAt).toBeTypeOf('number');
		expect(body.sizeBytes).toBeGreaterThan(0);

		// The edge write and registry upsert completed before the response.
		expect(store.has(key)).toBe(true);
		const upsert = executed.find((s) => s.sql.includes('INSERT INTO network_cache_entries'));
		expect(upsert?.params[0]).toBe(key);
	});

	it('preserves the cached entry and records the failure on upstream errors', async () => {
		const { store, waited, executed, platform } = fakePlatform();
		const key = keyFor('sa1');
		const oldPayload = { region: 'sa1', network_id: 'NEM', response: { data: [{ old: true }] } };
		const storedAt = Date.now() - 60_000;
		store.set(
			key,
			new Response(JSON.stringify(oldPayload), { headers: { 'x-stored-at': String(storedAt) } })
		);
		mocks.getNetworkData.mockRejectedValue(new Error('upstream down'));

		const response = await request({ key }, platform);
		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body.ok).toBe(false);
		expect(body.error).toBe('upstream down');
		expect(body.cached).toEqual({ storedAt, status: 'fresh' });

		// The old entry survives untouched.
		const kept = await /** @type {Response} */ (store.get(key)).clone().json();
		expect(kept).toEqual(oldPayload);

		// The lifecycle hook recorded the failure once background work drains.
		await Promise.all(waited.splice(0));
		const errorUpdate = executed.find((s) => s.sql.includes('SET last_error'));
		expect(errorUpdate?.params[0]).toBe(key);
		expect(errorUpdate?.params[1]).toBe('upstream down');
	});

	it('treats NoDataFound as a refresh failure rather than caching an empty shape', async () => {
		const { store, platform } = fakePlatform();
		const key = keyFor('tas1');
		mocks.getNetworkData.mockRejectedValue(new NoDataFound('No data found'));

		const response = await request({ key }, platform);
		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body.ok).toBe(false);
		expect(body.cached).toBeNull();
		expect(store.has(key)).toBe(false);
	});
});
