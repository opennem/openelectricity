/**
 * D1 registry of keyed SWR edge-cache writes for /api/network/data.
 *
 * Stores metadata only — the full responses stay in the Cache API. Every
 * writer is best-effort: registry failures must never delay or break the
 * public tracker response. Schema: network-cache-registry.sql (applied
 * manually; see src/routes/api/admin/network-cache/README.md).
 */

import { EDGE_MAX_AGE_MS } from '$lib/network-cache/freshness.js';

/** Registry rows older than this are pruned on successful writes. */
export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * @typedef {object} RegistryEntry
 * @property {string} cache_key
 * @property {string} canonical_query
 * @property {string} region
 * @property {string} metric
 * @property {string} interval
 * @property {string | null} date_start
 * @property {string | null} date_end
 * @property {string | null} primary_grouping
 * @property {number} is_historical
 * @property {number} fresh_ms
 * @property {number} stored_at
 * @property {number} size_bytes
 * @property {number} refresh_duration_ms
 * @property {string | null} last_error
 * @property {number | null} last_error_at
 */

/**
 * @param {App.Platform | undefined} platform
 * @returns {D1Database | null}
 */
export function registryDb(platform) {
	return platform?.env?.CACHE_REGISTRY ?? null;
}

const UPSERT_SQL = `INSERT INTO network_cache_entries (
	cache_key, canonical_query, region, metric, interval,
	date_start, date_end, primary_grouping, is_historical, fresh_ms,
	stored_at, size_bytes, refresh_duration_ms, last_error, last_error_at
) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, NULL, NULL)
ON CONFLICT (cache_key) DO UPDATE SET
	is_historical = excluded.is_historical,
	fresh_ms = excluded.fresh_ms,
	stored_at = excluded.stored_at,
	size_bytes = excluded.size_bytes,
	refresh_duration_ms = excluded.refresh_duration_ms,
	last_error = NULL,
	last_error_at = NULL`;

const PRUNE_SQL = 'DELETE FROM network_cache_entries WHERE stored_at < ?1';

/**
 * Upsert a registry row after a successful edge write, then prune rows older
 * than the retention window. Best-effort: never throws.
 *
 * @param {D1Database} db
 * @param {{
 *   cacheKey: string,
 *   canonicalQuery: string,
 *   region: string,
 *   metric: string,
 *   interval: string,
 *   dateStart?: string,
 *   dateEnd?: string,
 *   primaryGrouping?: string,
 *   isHistorical: boolean,
 *   freshMs: number,
 *   storedAt: number,
 *   sizeBytes: number,
 *   durationMs: number
 * }} entry
 */
export async function recordStored(db, entry) {
	try {
		await db
			.prepare(UPSERT_SQL)
			.bind(
				entry.cacheKey,
				entry.canonicalQuery,
				entry.region,
				entry.metric,
				entry.interval,
				entry.dateStart ?? null,
				entry.dateEnd ?? null,
				entry.primaryGrouping ?? null,
				entry.isHistorical ? 1 : 0,
				entry.freshMs,
				entry.storedAt,
				entry.sizeBytes,
				entry.durationMs
			)
			.run();
		await db
			.prepare(PRUNE_SQL)
			.bind(entry.storedAt - RETENTION_MS)
			.run();
	} catch {
		// Registry writes are best-effort.
	}
}

/**
 * Record a refresh failure against an existing row. Update-only: a key that
 * never stored has no row to inspect. Best-effort: never throws.
 *
 * @param {D1Database} db
 * @param {{ cacheKey: string, message: string, at: number }} failure
 */
export async function recordRefreshError(db, { cacheKey, message, at }) {
	try {
		await db
			.prepare(
				'UPDATE network_cache_entries SET last_error = ?2, last_error_at = ?3 WHERE cache_key = ?1'
			)
			.bind(cacheKey, message, at)
			.run();
	} catch {
		// Registry writes are best-effort.
	}
}

/**
 * @typedef {object} ListFilters
 * @property {string} [region]
 * @property {string} [metric]
 * @property {string} [interval]
 * @property {'live' | 'historical'} [window]
 * @property {'fresh' | 'stale' | 'expired'} [freshness]
 * @property {string} [q] - Substring of the canonical query
 */

/**
 * Build the WHERE clause for a filtered listing. Pure — exported for direct
 * unit testing; `nowMs` anchors the freshness comparisons.
 *
 * @param {ListFilters} filters
 * @param {number} nowMs
 * @returns {{ where: string, params: (string | number)[] }}
 */
export function buildListQuery(filters, nowMs) {
	/** @type {string[]} */
	const clauses = [];
	/** @type {(string | number)[]} */
	const params = [];

	if (filters.region) {
		clauses.push('region = ?');
		params.push(filters.region);
	}
	if (filters.metric) {
		clauses.push('metric = ?');
		params.push(filters.metric);
	}
	if (filters.interval) {
		clauses.push('interval = ?');
		params.push(filters.interval);
	}
	if (filters.window) {
		clauses.push('is_historical = ?');
		params.push(filters.window === 'historical' ? 1 : 0);
	}
	if (filters.freshness === 'fresh') {
		clauses.push('stored_at + fresh_ms >= ?');
		params.push(nowMs);
	} else if (filters.freshness === 'stale') {
		clauses.push('stored_at + fresh_ms < ? AND stored_at >= ?');
		params.push(nowMs, nowMs - EDGE_MAX_AGE_MS);
	} else if (filters.freshness === 'expired') {
		clauses.push('stored_at < ?');
		params.push(nowMs - EDGE_MAX_AGE_MS);
	}
	if (filters.q) {
		clauses.push("canonical_query LIKE ? ESCAPE '\\'");
		params.push(`%${filters.q.replace(/[\\%_]/g, '\\$&')}%`);
	}

	return { where: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '', params };
}

/**
 * List registry rows, newest storage time first.
 *
 * @param {D1Database} db
 * @param {{ filters: ListFilters, page: number, pageSize: number, nowMs?: number }} opts
 * @returns {Promise<{ items: RegistryEntry[], total: number }>}
 */
export async function listEntries(db, { filters, page, pageSize, nowMs = Date.now() }) {
	const { where, params } = buildListQuery(filters, nowMs);

	const countRow = await db
		.prepare(`SELECT COUNT(*) AS total FROM network_cache_entries${where}`)
		.bind(...params)
		.first();
	const total = Number(countRow?.total) || 0;

	const { results } = await db
		.prepare(`SELECT * FROM network_cache_entries${where} ORDER BY stored_at DESC LIMIT ? OFFSET ?`)
		.bind(...params, pageSize, (page - 1) * pageSize)
		.all();

	return { items: /** @type {RegistryEntry[]} */ (results), total };
}

/**
 * @param {D1Database} db
 * @param {string} cacheKey - Full synthetic cache key
 * @returns {Promise<RegistryEntry | null>}
 */
export async function getEntry(db, cacheKey) {
	const row = await db
		.prepare('SELECT * FROM network_cache_entries WHERE cache_key = ?1')
		.bind(cacheKey)
		.first();
	return /** @type {RegistryEntry | null} */ (row);
}
