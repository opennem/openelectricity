/**
 * Admin refresh of one network-data edge-cache entry.
 *
 * Accepts a registered cache key, re-validates and canonicalises its
 * parameters, fetches fresh upstream data and replaces the **current data
 * centre's** entry (other locations keep theirs until their own SWR
 * schedule). On success, the edge write and its best-effort registry hook
 * settle before the response resolves. On upstream failure the existing entry
 * is left untouched; failure metadata is recorded in background and the local
 * cached state is returned alongside the error. Requires a Clerk admin bearer
 * token; the documented browser caller is the Studio cache dashboard. See
 * README.md beside the parent route.
 *
 * Body: `{ "key": "<full synthetic cache key>" }`
 */

import { json } from '@sveltejs/kit';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { freshnessStatus } from '$lib/network-cache/freshness.js';
import { getEntry, registryDb } from '$lib/server/network-cache-registry.js';
import {
	freshnessFor,
	makeUpstreamFetcher,
	networkDataCache,
	parseRegisteredKey
} from '$lib/server/network-data.js';

const NO_STORE = { 'cache-control': 'no-store' };

export async function POST({ request, platform }) {
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

	const body = await request.json().catch(() => null);
	const key = body?.key;
	if (typeof key !== 'string' || !key) {
		return json({ error: 'A key property is required.' }, { status: 400, headers: NO_STORE });
	}
	const parsed = parseRegisteredKey(key);
	if (!parsed) {
		return json({ error: 'Malformed cache key.' }, { status: 400, headers: NO_STORE });
	}

	const registered = await getEntry(db, key);
	if (!registered) {
		return json(
			{ error: 'Unknown cache key — not in the registry.' },
			{ status: 404, headers: NO_STORE }
		);
	}

	try {
		const { value, stored, storedAt, sizeBytes, durationMs } = await networkDataCache.refresh(
			platform,
			parsed.canonical,
			makeUpstreamFetcher(parsed.params)
		);
		return json(
			{ ok: true, value, stored, storedAt, sizeBytes, durationMs },
			{ headers: NO_STORE }
		);
	} catch (err) {
		// The cache's onRefreshError hook has already recorded last_error; the
		// previously cached response (if this data centre holds one) survives.
		const local = await networkDataCache.peek(platform, parsed.canonical);
		const freshMs = freshnessFor(parsed.params.dateEnd);
		return json(
			{
				ok: false,
				error: String(/** @type {any} */ (err)?.message ?? err),
				cached: local
					? {
							storedAt: local.storedAt,
							status: freshnessStatus({ storedAt: local.storedAt, freshMs })
						}
					: null
			},
			{ status: 502, headers: NO_STORE }
		);
	}
}
