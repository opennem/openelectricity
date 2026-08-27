/**
 * Freshness derivation for keyed SWR edge-cache entries.
 *
 * Shared by the server (keyed-swr-cache retention, admin endpoints) and the
 * Studio cache dashboard, so it lives outside `$lib/server`. An entry is
 * `fresh` within its freshness period, `stale` between that and the edge
 * retention limit (served while a background refresh runs), and `expired`
 * once its retention TTL has elapsed. Cloudflare may evict an entry earlier,
 * so only a colo-local cache lookup can confirm that it is still present.
 */

/** Edge retention. The single source of truth for the 7-day figure. */
export const EDGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @param {{ storedAt: number, freshMs: number }} entry
 * @param {number} [nowMs]
 * @returns {'fresh' | 'stale' | 'expired'}
 */
export function freshnessStatus({ storedAt, freshMs }, nowMs = Date.now()) {
	const ageMs = nowMs - storedAt;
	if (ageMs > EDGE_MAX_AGE_MS) return 'expired';
	if (ageMs > freshMs) return 'stale';
	return 'fresh';
}

/**
 * @param {{ storedAt: number, freshMs: number }} entry
 * @param {number} [nowMs]
 * @returns {{ freshUntil: number, expiresAt: number, ageMs: number }}
 */
export function freshnessDeadlines({ storedAt, freshMs }, nowMs = Date.now()) {
	return {
		freshUntil: storedAt + freshMs,
		expiresAt: storedAt + EDGE_MAX_AGE_MS,
		ageMs: nowMs - storedAt
	};
}
