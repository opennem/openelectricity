import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getMarket: vi.fn(),
	getNetworkData: vi.fn()
}));

vi.mock('openelectricity', () => ({
	OpenElectricityClient: class {
		getMarket = mocks.getMarket;
		getNetworkData = mocks.getNetworkData;
	},
	NoDataFound: class NoDataFound extends Error {}
}));

import { GET } from './+server.js';

/** @param {string} search @param {ReturnType<typeof vi.fn>} [setHeaders] */
function request(search, setHeaders = vi.fn()) {
	return GET(
		/** @type {any} */ ({
			url: new URL(`https://example.test/api/network/data?${search}`),
			setHeaders
		})
	);
}

describe('network data endpoint', () => {
	beforeEach(() => {
		mocks.getMarket.mockReset().mockResolvedValue({ response: { data: [] } });
		mocks.getNetworkData.mockReset().mockResolvedValue({ response: { data: [] } });
	});

	it('rejects unknown query values and over-wide fine-grained ranges', async () => {
		expect((await request('region=unknown')).status).toBe(400);
		expect((await request('region=nsw1&metric=unknown')).status).toBe(400);
		expect(
			(
				await request(
					'region=nsw1&metric=power&interval=5m&date_start=2026-01-01&date_end=2026-02-01'
				)
			).status
		).toBe(400);
		expect(mocks.getMarket).not.toHaveBeenCalled();
		expect(mocks.getNetworkData).not.toHaveBeenCalled();
	});

	it('routes gross demand through the OE market query', async () => {
		const setHeaders = vi.fn();
		const response = await request(
			'region=nsw1&metric=demand_gross&interval=1h&date_start=2026-01-01&date_end=2026-01-02',
			setHeaders
		);

		expect(response.status).toBe(200);
		expect(mocks.getMarket).toHaveBeenCalledWith('NEM', ['demand_gross'], {
			interval: '1h',
			dateStart: '2026-01-01',
			dateEnd: '2026-01-02',
			network_region: 'NSW1'
		});
		expect(mocks.getNetworkData).not.toHaveBeenCalled();
		// The historical fixture starts with a cold cache.
		expect(setHeaders).toHaveBeenCalledWith({
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=3600',
			'x-oe-cache': 'miss'
		});
	});

	it('merges imports and exports into regional NEM generation', async () => {
		mocks.getNetworkData.mockResolvedValue({
			response: {
				data: [
					{
						metric: 'power',
						results: [
							{
								columns: { fueltech: 'coal_black' },
								data: [['2026-01-01T00:00:00', 1_000]]
							}
						]
					}
				]
			}
		});
		mocks.getMarket.mockResolvedValue({
			response: {
				data: [
					{
						metric: 'flow_imports',
						results: [{ columns: { interconnector: 'VNI' }, data: [['2026-01-01T00:00:00', 300]] }]
					},
					{
						metric: 'flow_exports',
						results: [{ columns: { interconnector: 'QNI' }, data: [['2026-01-01T00:00:00', 180]] }]
					}
				]
			}
		});

		const response = await request(
			'region=nsw1&metric=power&interval=1h&date_start=2026-01-01&date_end=2026-01-02'
		);
		const body = await response.json();
		const results = body.response.data.find((entry) => entry.metric === 'power').results;

		expect(mocks.getMarket).toHaveBeenCalledWith('NEM', ['flow_imports', 'flow_exports'], {
			interval: '1h',
			dateStart: '2026-01-01',
			dateEnd: '2026-01-02',
			network_region: 'NSW1'
		});
		expect(results).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ columns: expect.objectContaining({ fueltech: 'imports' }) }),
				expect.objectContaining({ columns: expect.objectContaining({ fueltech: 'exports' }) })
			])
		);
	});

	it('uses energy flow metrics for regional energy and keeps existing flow fuel techs', async () => {
		mocks.getNetworkData.mockResolvedValue({
			response: {
				data: [
					{
						metric: 'energy',
						results: [{ columns: { fueltech: 'imports' }, data: [['2026-01-01T00:00:00', 250]] }]
					}
				]
			}
		});
		mocks.getMarket.mockResolvedValue({
			response: {
				data: [
					{
						metric: 'flow_imports_energy',
						results: [{ columns: { interconnector: 'VNI' }, data: [['2026-01-01T00:00:00', 300]] }]
					},
					{
						metric: 'flow_exports_energy',
						results: [{ columns: { interconnector: 'QNI' }, data: [['2026-01-01T00:00:00', 180]] }]
					}
				]
			}
		});

		const response = await request(
			'region=vic1&metric=energy&interval=1d&date_start=2026-01-01&date_end=2026-01-02'
		);
		const body = await response.json();
		const results = body.response.data.find((entry) => entry.metric === 'energy').results;

		expect(mocks.getMarket).toHaveBeenCalledWith(
			'NEM',
			['flow_imports_energy', 'flow_exports_energy'],
			{
				interval: '1d',
				dateStart: '2026-01-01',
				dateEnd: '2026-01-02',
				network_region: 'VIC1'
			}
		);
		expect(results.filter((result) => result.columns.fueltech === 'imports')).toHaveLength(1);
		expect(results.filter((result) => result.columns.fueltech === 'exports')).toHaveLength(1);
	});

	it('does not request regional flows for whole networks or WA', async () => {
		await request('region=_all&metric=power&interval=1h');
		await request('region=wem&metric=power&interval=1h');
		expect(mocks.getNetworkData).toHaveBeenCalledTimes(2);
		expect(mocks.getMarket).not.toHaveBeenCalled();
	});

	it('does not invent a national spot price', async () => {
		const response = await request('region=au&metric=price&interval=1h');
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'A national spot price is not available.' });
	});
});

describe('edge SWR cache (fake platform)', () => {
	// Reset mocks because the sibling suite's hook does not apply here.
	beforeEach(() => {
		mocks.getMarket.mockReset().mockResolvedValue({ response: { data: [] } });
		mocks.getNetworkData.mockReset().mockResolvedValue({ response: { data: [] } });
	});

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

	/** @param {string} search @param {any} platform @param {ReturnType<typeof vi.fn>} [setHeaders] */
	function platformRequest(search, platform, setHeaders = vi.fn()) {
		return GET(
			/** @type {any} */ ({
				url: new URL(`https://example.test/api/network/data?${search}`),
				setHeaders,
				platform
			})
		);
	}

	it('serves a repeat request from the edge without touching upstream', async () => {
		const { platform, waited } = fakePlatform();
		mocks.getNetworkData.mockResolvedValue({ response: { data: [{ payload: true }] } });
		const search =
			'region=vic1&metric=energy&interval=1d&date_start=2026-01-01&date_end=2026-02-01';

		const first = await platformRequest(search, platform);
		expect(first.status).toBe(200);
		await Promise.all(waited.splice(0));
		expect(mocks.getNetworkData).toHaveBeenCalledTimes(1);

		const setHeaders = vi.fn();
		const second = await platformRequest(search, platform, setHeaders);
		expect(second.status).toBe(200);
		expect(mocks.getNetworkData).toHaveBeenCalledTimes(1); // The edge hit skips upstream.
		expect(setHeaders).toHaveBeenCalledWith(expect.objectContaining({ 'x-oe-cache': 'hit' }));
		expect(await second.json()).toEqual(await first.json());
	});

	it('query-pair order does not fragment the cache key', async () => {
		const { platform, waited } = fakePlatform();
		mocks.getNetworkData.mockResolvedValue({ response: { data: [{ payload: true }] } });

		await platformRequest(
			'region=sa1&metric=energy&interval=1d&date_start=2026-01-01&date_end=2026-02-01',
			platform
		);
		await Promise.all(waited.splice(0));
		const setHeaders = vi.fn();
		await platformRequest(
			'date_end=2026-02-01&date_start=2026-01-01&interval=1d&metric=energy&region=sa1',
			platform,
			setHeaders
		);

		expect(mocks.getNetworkData).toHaveBeenCalledTimes(1);
		expect(setHeaders).toHaveBeenCalledWith(expect.objectContaining({ 'x-oe-cache': 'hit' }));
	});

	it('normalises defaults and ignores unused query parameters', async () => {
		const { platform, waited } = fakePlatform();
		mocks.getNetworkData.mockResolvedValue({ response: { data: [{ payload: true }] } });

		await platformRequest('date_start=2026-02-01&date_end=2026-02-02', platform);
		await Promise.all(waited.splice(0));

		const setHeaders = vi.fn();
		await platformRequest(
			'metric=power&ignored=value&date_end=2026-02-02&region=_all&interval=5m&date_start=2026-02-01',
			platform,
			setHeaders
		);

		expect(mocks.getNetworkData).toHaveBeenCalledTimes(1);
		expect(setHeaders).toHaveBeenCalledWith(expect.objectContaining({ 'x-oe-cache': 'hit' }));
	});
});

describe('cache registry hooks (fake platform + D1)', () => {
	beforeEach(() => {
		mocks.getMarket.mockReset().mockResolvedValue({ response: { data: [] } });
		mocks.getNetworkData.mockReset().mockResolvedValue({ response: { data: [] } });
	});

	/**
	 * Fake Cloudflare cache, waitUntil collector and a D1 binding that records
	 * (or refuses) every statement.
	 * @param {{ throwing?: boolean }} [opts]
	 */
	function fakePlatform({ throwing = false } = {}) {
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
			const record = () => {
				if (throwing) throw new Error('d1 down');
				executed.push({ sql, params });
			};
			return {
				bind: (/** @type {unknown[]} */ ...values) => statement(sql, values),
				run: async () => {
					record();
				},
				first: async () => {
					record();
					return null;
				},
				all: async () => {
					record();
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

	/** @param {string} search @param {any} platform @param {ReturnType<typeof vi.fn>} [setHeaders] */
	function platformRequest(search, platform, setHeaders = vi.fn()) {
		return GET(
			/** @type {any} */ ({
				url: new URL(`https://example.test/api/network/data?${search}`),
				setHeaders,
				platform
			})
		);
	}

	it('registers successful cache writes in the D1 registry', async () => {
		const { waited, executed, platform } = fakePlatform();
		mocks.getNetworkData.mockResolvedValue({ response: { data: [{ payload: true }] } });
		const search =
			'region=qld1&metric=energy&interval=1d&date_start=2026-01-01&date_end=2026-02-01';

		const response = await platformRequest(search, platform);
		expect(response.status).toBe(200);
		await Promise.all(waited.splice(0));

		const upsert = executed.find((s) => s.sql.includes('INSERT INTO network_cache_entries'));
		expect(upsert?.params[1]).toBe(
			'region=qld1&metric=energy&interval=1d&date_start=2026-01-01&date_end=2026-02-01'
		);
		expect(executed.some((s) => s.sql.includes('DELETE FROM network_cache_entries'))).toBe(true);
	});

	it('a failing registry never affects the public response', async () => {
		const { waited, platform } = fakePlatform({ throwing: true });
		mocks.getNetworkData.mockResolvedValue({ response: { data: [{ payload: true }] } });
		const setHeaders = vi.fn();
		const search =
			'region=tas1&metric=energy&interval=1d&date_start=2026-01-01&date_end=2026-02-01';

		const response = await platformRequest(search, platform, setHeaders);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ region: 'tas1', network_id: 'NEM' });
		// Draining rejects if the registry failure leaked into background work.
		await Promise.all(waited.splice(0));

		// The edge cache still works: a repeat request is a hit, not a refetch.
		const repeat = vi.fn();
		await platformRequest(search, platform, repeat);
		expect(mocks.getNetworkData).toHaveBeenCalledTimes(1);
		expect(repeat).toHaveBeenCalledWith(expect.objectContaining({ 'x-oe-cache': 'hit' }));
	});
});
