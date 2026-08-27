/**
 * Admin inspection of one network-data edge-cache entry.
 *
 * Reads the exact entry from the **current data centre's** Cache API and
 * returns its complete JSON payload with local freshness metadata. A miss is
 * an expected, colo-local state (other data centres may still hold the
 * entry), so it returns 200 `{ found: false }` — and this endpoint never
 * populates the cache. Requires a Clerk admin bearer token; the documented
 * browser caller is the Studio cache dashboard. See README.md beside the
 * parent route.
 *
 * Query params:
 *   key — the full synthetic cache key, exactly as listed by the registry
 */

import { json } from '@sveltejs/kit';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { freshnessDeadlines, freshnessStatus } from '$lib/network-cache/freshness.js';
import { registryDb } from '$lib/server/network-cache-registry.js';
import { freshnessFor, networkDataCache, parseRegisteredKey } from '$lib/server/network-data.js';

const NO_STORE = { 'cache-control': 'no-store' };

export async function GET({ request, url, platform }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	if (!registryDb(platform)) {
		return json(
			{ error: 'The CACHE_REGISTRY D1 binding is not configured in this environment.' },
			{ status: 503, headers: NO_STORE }
		);
	}

	const key = url.searchParams.get('key');
	if (!key) {
		return json(
			{ error: 'A key query parameter is required.' },
			{ status: 400, headers: NO_STORE }
		);
	}
	const parsed = parseRegisteredKey(key);
	if (!parsed) {
		return json({ error: 'Malformed cache key.' }, { status: 400, headers: NO_STORE });
	}

	const local = await networkDataCache.peek(platform, parsed.canonical);
	if (!local) {
		return json({ found: false, key }, { headers: NO_STORE });
	}

	// Local freshness re-derives the period from the key's date_end — the
	// same classification the public endpoint applies when storing.
	const freshMs = freshnessFor(parsed.params.dateEnd);
	const entry = { storedAt: local.storedAt, freshMs };

	return json(
		{
			found: true,
			key,
			value: local.value,
			storedAt: local.storedAt,
			sizeBytes: local.sizeBytes,
			status: freshnessStatus(entry),
			...freshnessDeadlines(entry)
		},
		{ headers: NO_STORE }
	);
}
