import { describe, expect, it } from 'vitest';
import { EDGE_MAX_AGE_MS } from '$lib/network-cache/freshness.js';
import {
	RETENTION_MS,
	buildListQuery,
	getEntry,
	listEntries,
	recordRefreshError,
	recordStored,
	registryDb
} from './network-cache-registry.js';

/**
 * Recording fake D1: captures every executed statement's SQL and bound
 * params; `first`/`all` return canned results.
 *
 * @param {{ firstResult?: any, allResults?: any[], throwing?: boolean }} [opts]
 */
function fakeD1({ firstResult = null, allResults = [], throwing = false } = {}) {
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
				return firstResult;
			},
			all: async () => {
				record();
				return { results: allResults };
			}
		};
	}

	return {
		executed,
		db: /** @type {D1Database} */ ({ prepare: (/** @type {string} */ sql) => statement(sql, []) })
	};
}

const ENTRY = {
	cacheKey: 'https://edge-cache.example/network-data-v1?region=nsw1&metric=power&interval=5m',
	canonicalQuery: 'region=nsw1&metric=power&interval=5m',
	region: 'nsw1',
	metric: 'power',
	interval: '5m',
	isHistorical: false,
	freshMs: 300000,
	storedAt: 1_700_000_000_000,
	sizeBytes: 1024,
	durationMs: 850
};

describe('registryDb', () => {
	it('returns the binding when present and null otherwise', () => {
		const { db } = fakeD1();
		expect(registryDb(/** @type {any} */ ({ env: { CACHE_REGISTRY: db } }))).toBe(db);
		expect(registryDb(/** @type {any} */ ({ env: {} }))).toBeNull();
		expect(registryDb(/** @type {any} */ ({}))).toBeNull();
		expect(registryDb(undefined)).toBeNull();
	});
});

describe('recordStored', () => {
	it('upserts the row then prunes entries older than the retention window', async () => {
		const { db, executed } = fakeD1();
		await recordStored(db, ENTRY);

		expect(executed).toHaveLength(2);
		const [upsert, prune] = executed;
		expect(upsert.sql).toContain('INSERT INTO network_cache_entries');
		expect(upsert.sql).toContain('ON CONFLICT (cache_key) DO UPDATE');
		expect(upsert.sql).toContain('last_error = NULL'); // Success clears the error columns.
		expect(upsert.params).toEqual([
			ENTRY.cacheKey,
			ENTRY.canonicalQuery,
			'nsw1',
			'power',
			'5m',
			null,
			null,
			null,
			0,
			300000,
			ENTRY.storedAt,
			1024,
			850
		]);
		expect(prune.sql).toContain('DELETE FROM network_cache_entries WHERE stored_at <');
		expect(prune.params).toEqual([ENTRY.storedAt - RETENTION_MS]);
	});

	it('stores historical flags and optional dates', async () => {
		const { db, executed } = fakeD1();
		await recordStored(db, {
			...ENTRY,
			dateStart: '2023-01-01',
			dateEnd: '2024-01-01',
			primaryGrouping: 'network_region',
			isHistorical: true
		});
		expect(executed[0].params.slice(5, 9)).toEqual([
			'2023-01-01',
			'2024-01-01',
			'network_region',
			1
		]);
	});

	it('never throws when the database fails', async () => {
		const { db } = fakeD1({ throwing: true });
		await expect(recordStored(db, ENTRY)).resolves.toBeUndefined();
	});
});

describe('recordRefreshError', () => {
	it('updates only — a key that never stored has no row to annotate', async () => {
		const { db, executed } = fakeD1();
		await recordRefreshError(db, { cacheKey: ENTRY.cacheKey, message: 'upstream down', at: 123 });

		expect(executed).toHaveLength(1);
		expect(executed[0].sql).toContain('UPDATE network_cache_entries SET last_error');
		expect(executed[0].sql).not.toContain('INSERT');
		expect(executed[0].params).toEqual([ENTRY.cacheKey, 'upstream down', 123]);
	});

	it('never throws when the database fails', async () => {
		const { db } = fakeD1({ throwing: true });
		await expect(
			recordRefreshError(db, { cacheKey: ENTRY.cacheKey, message: 'x', at: 1 })
		).resolves.toBeUndefined();
	});
});

describe('buildListQuery', () => {
	const NOW = 1_700_000_000_000;

	it('returns no WHERE clause without filters', () => {
		expect(buildListQuery({}, NOW)).toEqual({ where: '', params: [] });
	});

	it('builds each filter clause', () => {
		expect(buildListQuery({ region: 'nsw1' }, NOW)).toEqual({
			where: ' WHERE region = ?',
			params: ['nsw1']
		});
		expect(buildListQuery({ metric: 'power' }, NOW).params).toEqual(['power']);
		expect(buildListQuery({ interval: '5m' }, NOW).params).toEqual(['5m']);
		expect(buildListQuery({ window: 'historical' }, NOW)).toEqual({
			where: ' WHERE is_historical = ?',
			params: [1]
		});
		expect(buildListQuery({ window: 'live' }, NOW).params).toEqual([0]);
	});

	it('anchors freshness clauses to the reference time', () => {
		expect(buildListQuery({ freshness: 'fresh' }, NOW)).toEqual({
			where: ' WHERE stored_at + fresh_ms >= ?',
			params: [NOW]
		});
		expect(buildListQuery({ freshness: 'stale' }, NOW)).toEqual({
			where: ' WHERE stored_at + fresh_ms < ? AND stored_at >= ?',
			params: [NOW, NOW - EDGE_MAX_AGE_MS]
		});
		expect(buildListQuery({ freshness: 'expired' }, NOW)).toEqual({
			where: ' WHERE stored_at < ?',
			params: [NOW - EDGE_MAX_AGE_MS]
		});
	});

	it('combines filters with AND in a stable order', () => {
		const { where, params } = buildListQuery(
			{ region: 'wem', metric: 'energy', window: 'live', q: 'date_start' },
			NOW
		);
		expect(where).toBe(
			" WHERE region = ? AND metric = ? AND is_historical = ? AND canonical_query LIKE ? ESCAPE '\\'"
		);
		expect(params).toEqual(['wem', 'energy', 0, '%date\\_start%']);
	});

	it('escapes LIKE wildcards in the search term', () => {
		expect(buildListQuery({ q: '50%_\\' }, NOW).params).toEqual(['%50\\%\\_\\\\%']);
	});
});

describe('listEntries', () => {
	it('pages with a shared WHERE, newest first', async () => {
		const rows = [{ cache_key: 'k1' }, { cache_key: 'k2' }];
		const { db, executed } = fakeD1({ firstResult: { total: 42 }, allResults: rows });

		const result = await listEntries(db, {
			filters: { region: 'nsw1' },
			page: 3,
			pageSize: 10,
			nowMs: 1
		});

		expect(result).toEqual({ items: rows, total: 42 });
		const [count, select] = executed;
		expect(count.sql).toContain('SELECT COUNT(*) AS total FROM network_cache_entries WHERE');
		expect(count.params).toEqual(['nsw1']);
		expect(select.sql).toContain('ORDER BY stored_at DESC LIMIT ? OFFSET ?');
		expect(select.params).toEqual(['nsw1', 10, 20]);
	});

	it('coerces a missing count to zero', async () => {
		const { db } = fakeD1({ firstResult: null, allResults: [] });
		const result = await listEntries(db, { filters: {}, page: 1, pageSize: 25, nowMs: 1 });
		expect(result).toEqual({ items: [], total: 0 });
	});
});

describe('getEntry', () => {
	it('looks up one row by full cache key', async () => {
		const row = { cache_key: ENTRY.cacheKey };
		const { db, executed } = fakeD1({ firstResult: row });

		expect(await getEntry(db, ENTRY.cacheKey)).toBe(row);
		expect(executed[0].sql).toContain('WHERE cache_key = ?1');
		expect(executed[0].params).toEqual([ENTRY.cacheKey]);
	});

	it('returns null for unknown keys', async () => {
		const { db } = fakeD1({ firstResult: null });
		expect(await getEntry(db, 'nope')).toBeNull();
	});
});
