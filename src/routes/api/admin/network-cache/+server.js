/**
 * Admin listing of the network-data edge-cache registry (Cloudflare D1).
 *
 * Returns registry metadata about cache writes — the **projected** state of
 * each entry, not what any particular data centre currently holds. Requires a
 * Clerk admin bearer token; the documented browser caller is the Studio cache
 * dashboard (`/studio/cache/network-data`). Responses are never cached. See
 * README.md beside this route.
 *
 * Query params:
 *   region    — filter by region value (e.g. '_all', 'nsw1', 'au')
 *   metric    — filter by metric (data or market metric)
 *   interval  — filter by interval ('5m', '1h', '1d', '7d', '1M', '3M', '1y')
 *   window    — 'live' | 'historical'
 *   freshness — 'fresh' | 'stale' | 'expired' (projected, from stored_at)
 *   q         — substring match against the canonical query
 *   page      — 1-based page number (default 1)
 *   pageSize  — rows per page (default 25, max 100)
 */

import { json } from '@sveltejs/kit';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { freshnessDeadlines, freshnessStatus } from '$lib/network-cache/freshness.js';
import { listEntries, registryDb } from '$lib/server/network-cache-registry.js';
import { VALID_INTERVALS, VALID_REGIONS, isValidMetric } from '$lib/server/network-data.js';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const NO_STORE = { 'cache-control': 'no-store' };

/**
 * @param {string | null} value
 * @param {number} fallback
 * @returns {number}
 */
function toPositiveInt(value, fallback) {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Present a registry row for the dashboard: camel-cased with projected
 * freshness computed at a single reference time.
 *
 * @param {import('$lib/server/network-cache-registry.js').RegistryEntry} row
 * @param {number} nowMs
 */
function presentEntry(row, nowMs) {
	const entry = { storedAt: row.stored_at, freshMs: row.fresh_ms };
	return {
		cacheKey: row.cache_key,
		canonicalQuery: row.canonical_query,
		region: row.region,
		metric: row.metric,
		interval: row.interval,
		dateStart: row.date_start,
		dateEnd: row.date_end,
		primaryGrouping: row.primary_grouping,
		isHistorical: Boolean(row.is_historical),
		freshMs: row.fresh_ms,
		storedAt: row.stored_at,
		sizeBytes: row.size_bytes,
		refreshDurationMs: row.refresh_duration_ms,
		lastError: row.last_error,
		lastErrorAt: row.last_error_at,
		status: freshnessStatus(entry, nowMs),
		...freshnessDeadlines(entry, nowMs)
	};
}

export async function GET({ request, url, platform }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const db = registryDb(platform);
	if (!db) {
		return json(
			{ error: 'The CACHE_REGISTRY D1 binding is not configured in this environment.' },
			{ status: 503, headers: NO_STORE }
		);
	}

	const { searchParams } = url;
	const region = searchParams.get('region') || undefined;
	const metric = searchParams.get('metric') || undefined;
	const interval = searchParams.get('interval') || undefined;
	const window = searchParams.get('window') || undefined;
	const freshness = searchParams.get('freshness') || undefined;
	const q = searchParams.get('q') || undefined;

	if (region && !VALID_REGIONS.has(region)) {
		return json({ error: `Invalid region: ${region}` }, { status: 400, headers: NO_STORE });
	}
	if (metric && !isValidMetric(metric)) {
		return json({ error: `Invalid metric: ${metric}` }, { status: 400, headers: NO_STORE });
	}
	if (interval && !VALID_INTERVALS.has(interval)) {
		return json({ error: `Invalid interval: ${interval}` }, { status: 400, headers: NO_STORE });
	}
	if (window && window !== 'live' && window !== 'historical') {
		return json({ error: `Invalid window: ${window}` }, { status: 400, headers: NO_STORE });
	}
	if (freshness && freshness !== 'fresh' && freshness !== 'stale' && freshness !== 'expired') {
		return json({ error: `Invalid freshness: ${freshness}` }, { status: 400, headers: NO_STORE });
	}

	const page = toPositiveInt(searchParams.get('page'), 1);
	const pageSize = Math.min(
		toPositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
		MAX_PAGE_SIZE
	);
	const now = Date.now();

	const { items, total } = await listEntries(db, {
		filters: {
			region,
			metric,
			interval,
			window: /** @type {'live' | 'historical' | undefined} */ (window),
			freshness: /** @type {'fresh' | 'stale' | 'expired' | undefined} */ (freshness),
			q
		},
		page,
		pageSize,
		nowMs: now
	});

	return json(
		{
			items: items.map((row) => presentEntry(row, now)),
			total,
			page,
			totalPages: Math.max(1, Math.ceil(total / pageSize)),
			now
		},
		{ headers: NO_STORE }
	);
}
