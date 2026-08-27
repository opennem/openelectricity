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

const ADMIN = {
	authenticated: true,
	isAdmin: true,
	isSuperAdmin: false,
	userId: 'user-1',
	userEmail: 'admin@example.test'
};

/**
 * Recording fake D1 with canned results.
 *
 * @param {{ firstResult?: any, allResults?: any[] }} [opts]
 */
function fakeD1({ firstResult = null, allResults = [] } = {}) {
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
				return firstResult;
			},
			all: async () => {
				executed.push({ sql, params });
				return { results: allResults };
			}
		};
	}
	return { executed, db: { prepare: (/** @type {string} */ sql) => statement(sql, []) } };
}

/**
 * @param {string} search
 * @param {any} [platform]
 */
function request(search, platform) {
	return GET(
		/** @type {any} */ ({
			request: new Request('https://example.test/api/admin/network-cache'),
			url: new URL(`https://example.test/api/admin/network-cache?${search}`),
			platform
		})
	);
}

const ROW = {
	cache_key:
		'https://edge-cache.openelectricity.org.au/network-data-v1?region=nsw1&metric=power&interval=5m',
	canonical_query: 'region=nsw1&metric=power&interval=5m',
	region: 'nsw1',
	metric: 'power',
	interval: '5m',
	date_start: null,
	date_end: null,
	primary_grouping: null,
	is_historical: 0,
	fresh_ms: 300000,
	stored_at: Date.now() - 60_000,
	size_bytes: 2048,
	refresh_duration_ms: 900,
	last_error: null,
	last_error_at: null
};

describe('admin network-cache list endpoint', () => {
	beforeEach(() => {
		mocks.verifyAdmin.mockReset().mockResolvedValue(ADMIN);
	});

	it('rejects unauthenticated and non-admin callers', async () => {
		mocks.verifyAdmin.mockResolvedValue({ authenticated: false, isAdmin: false });
		expect((await request('')).status).toBe(401);

		mocks.verifyAdmin.mockResolvedValue({ authenticated: true, isAdmin: false });
		expect((await request('')).status).toBe(403);
	});

	it('returns 503 when the registry binding is absent', async () => {
		const response = await request('', {});
		expect(response.status).toBe(503);
		expect((await response.json()).error).toContain('CACHE_REGISTRY');
	});

	it('rejects unknown filter values', async () => {
		const { db } = fakeD1();
		const platform = { env: { CACHE_REGISTRY: db } };
		expect((await request('region=mars', platform)).status).toBe(400);
		expect((await request('metric=unknown', platform)).status).toBe(400);
		expect((await request('interval=2h', platform)).status).toBe(400);
		expect((await request('window=recent', platform)).status).toBe(400);
		expect((await request('freshness=old', platform)).status).toBe(400);
	});

	it('lists presented entries with projected freshness and never caches', async () => {
		const { db } = fakeD1({ firstResult: { total: 1 }, allResults: [ROW] });
		const response = await request('region=nsw1', { env: { CACHE_REGISTRY: db } });

		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('no-store');
		const body = await response.json();
		expect(body.total).toBe(1);
		expect(body.page).toBe(1);
		expect(body.totalPages).toBe(1);
		expect(body.now).toBeTypeOf('number');
		expect(body.items[0]).toMatchObject({
			cacheKey: ROW.cache_key,
			canonicalQuery: ROW.canonical_query,
			region: 'nsw1',
			isHistorical: false,
			freshMs: 300000,
			sizeBytes: 2048,
			refreshDurationMs: 900,
			lastError: null,
			status: 'fresh'
		});
		expect(body.items[0].freshUntil).toBe(ROW.stored_at + ROW.fresh_ms);
	});

	it('clamps the page size and passes filters through to the query', async () => {
		const { db, executed } = fakeD1({ firstResult: { total: 0 }, allResults: [] });
		await request('pageSize=999&page=2&freshness=stale', { env: { CACHE_REGISTRY: db } });

		const select = executed.find((s) => s.sql.includes('ORDER BY stored_at DESC'));
		expect(select?.sql).toContain('stored_at + fresh_ms < ?');
		// LIMIT clamps to 100; OFFSET reflects page 2.
		expect(select?.params.slice(-2)).toEqual([100, 100]);
	});
});
