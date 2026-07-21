/**
 * Stale-while-revalidate cache around `fetchHomepageRenewablesInput()`.
 *
 * The homepage load() calls the fetch in-process, so the route's HTTP
 * cache-control never reaches the Cloudflare edge cache — caching has to live
 * here, around the fetch itself, to cover both that path and direct
 * `/api/renewables` hits. Two tiers: a module-scope copy (instant within an
 * isolate) and the Cloudflare Cache API (survives isolate recycling, shared
 * per-colo, needs no bindings). Both degrade to nothing in `vite dev`.
 */

import { fetchHomepageRenewablesInput } from './fetch-renewables.server';
import { findLatestLastDate, lastCompleteMonthIso } from './renewables-month.js';

/** @typedef {{ data: { marketStats: StatsData[] } | null, error: string | null }} RenewablesEnvelope */

/**
 * Synthetic cache key — never actually fetched; the Cache API just needs a
 * stable http(s) URL to file the entry under.
 */
const EDGE_CACHE_KEY = 'https://cache.openelectricity.org.au/internal/homepage-renewables-v1';

/**
 * Freshness windows. The underlying data only changes monthly, but the newest
 * month can land at OE a while after the calendar rolls over — so a payload
 * that already contains the last complete month is trusted for hours, while a
 * lagging one is rechecked frequently until the new month appears.
 */
export const FRESH_MS_CURRENT = 6 * 60 * 60 * 1000;
export const FRESH_MS_LAGGING = 15 * 60 * 1000;

/** Edge retention only — freshness is decided in code via the stored-at header. */
const EDGE_MAX_AGE_S = 7 * 24 * 60 * 60;
const STORED_AT_HEADER = 'x-stored-at';

/** @type {{ envelope: RenewablesEnvelope, storedAt: number } | null} */
let memory = null;

/** @type {Promise<RenewablesEnvelope> | null} */
let inflight = null;

/**
 * Whether a cached envelope is still fresh. Evaluated against
 * `lastCompleteMonthIso()` at read time, so the moment a month rolls over
 * (NEM-local) every cached payload drops to the short lagging window until a
 * refresh brings in the new month.
 *
 * @param {RenewablesEnvelope | null | undefined} envelope
 * @param {number} storedAt — epoch ms when the envelope was cached
 * @returns {boolean}
 */
export function isRenewablesEnvelopeFresh(envelope, storedAt) {
	const payloadLast = findLatestLastDate(envelope?.data?.marketStats ?? []);
	const upToDate = payloadLast !== null && payloadLast >= lastCompleteMonthIso();
	return Date.now() - storedAt < (upToDate ? FRESH_MS_CURRENT : FRESH_MS_LAGGING);
}

/**
 * @param {RenewablesEnvelope} envelope
 * @returns {boolean}
 */
function isCacheable(envelope) {
	return !envelope.error && (envelope.data?.marketStats?.length ?? 0) > 0;
}

/**
 * @param {App.Platform | undefined} platform
 * @returns {Promise<{ envelope: RenewablesEnvelope, storedAt: number } | null>}
 */
async function readEdgeCache(platform) {
	try {
		const hit = await platform?.caches?.default?.match(EDGE_CACHE_KEY);
		if (!hit) return null;
		return {
			envelope: await hit.json(),
			// A missing header parses to 0 → treated as maximally stale: still
			// served, but a background refresh is scheduled immediately.
			storedAt: Number(hit.headers.get(STORED_AT_HEADER)) || 0
		};
	} catch {
		return null;
	}
}

/**
 * @param {App.Platform | undefined} platform
 * @param {RenewablesEnvelope} envelope
 * @param {number} storedAt
 */
async function writeEdgeCache(platform, envelope, storedAt) {
	try {
		await platform?.caches?.default?.put(
			EDGE_CACHE_KEY,
			new Response(JSON.stringify(envelope), {
				headers: {
					'content-type': 'application/json',
					'cache-control': `public, max-age=${EDGE_MAX_AGE_S}`,
					[STORED_AT_HEADER]: String(storedAt)
				}
			})
		);
	} catch {
		// Edge cache is best-effort — memory tier still holds the envelope.
	}
}

/**
 * Fetch from OE and cache the result. Single-flight: concurrent callers share
 * one set of OE requests. On failure, an existing stale envelope keeps being
 * served rather than surfacing the error.
 *
 * @param {App.Platform | undefined} platform
 * @returns {Promise<RenewablesEnvelope>}
 */
function refresh(platform) {
	if (inflight) return inflight;

	inflight = fetchHomepageRenewablesInput()
		.then((envelope) => {
			if (isCacheable(envelope)) {
				const storedAt = Date.now();
				memory = { envelope, storedAt };
				// Not awaited — the caller shouldn't wait on the Cache API put;
				// waitUntil keeps it alive past the response (never rejects, the
				// helper catches internally).
				const edgeWrite = writeEdgeCache(platform, envelope, storedAt);
				platform?.context?.waitUntil?.(edgeWrite);
				return envelope;
			}
			return memory?.envelope ?? envelope;
		})
		.finally(() => {
			inflight = null;
		});

	return inflight;
}

/**
 * @param {App.Platform | undefined} platform
 */
function scheduleRefresh(platform) {
	const pending = refresh(platform).catch(() => {});
	// waitUntil keeps the Workers isolate alive past the response; in dev
	// (no platform) fire-and-forget under Node is fine.
	platform?.context?.waitUntil?.(pending);
}

/**
 * Homepage renewables envelope, served stale-while-revalidate. Only a true
 * cold miss (new isolate + nothing at the colo's edge cache) blocks on the OE
 * API; everything else returns immediately and refreshes in the background.
 *
 * @param {App.Platform | undefined} platform
 * @returns {Promise<RenewablesEnvelope>}
 */
export async function getHomepageRenewablesCached(platform) {
	memory ??= await readEdgeCache(platform);
	if (!memory) return refresh(platform);

	if (!isRenewablesEnvelopeFresh(memory.envelope, memory.storedAt)) scheduleRefresh(platform);
	return memory.envelope;
}
