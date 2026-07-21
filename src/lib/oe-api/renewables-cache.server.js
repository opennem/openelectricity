/**
 * Homepage renewables envelope, served through the shared SWR cache
 * (`$lib/server/swr-cache.js`). This module only supplies the domain policy:
 * what to fetch, when a payload counts as fresh, and what may be cached.
 */

import { createSwrCache } from '$lib/server/swr-cache';
import { fetchHomepageRenewablesInput } from './fetch-renewables.server';
import { findLatestLastDate, lastCompleteMonthIso } from './renewables-month.js';

/** @typedef {{ data: { marketStats: StatsData[] } | null, error: string | null }} RenewablesEnvelope */

/**
 * Freshness windows. The underlying data only changes monthly, but the newest
 * month can land at OE a while after the calendar rolls over — so a payload
 * that already contains the last complete month is trusted for hours, while a
 * lagging one is rechecked frequently until the new month appears.
 */
export const FRESH_MS_CURRENT = 6 * 60 * 60 * 1000;
export const FRESH_MS_LAGGING = 15 * 60 * 1000;

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

const cache = createSwrCache({
	edgeCacheKey: 'https://cache.openelectricity.org.au/internal/homepage-renewables-v1',
	fetcher: fetchHomepageRenewablesInput,
	isFresh: isRenewablesEnvelopeFresh,
	isCacheable: (envelope) => !envelope.error && (envelope.data?.marketStats?.length ?? 0) > 0
});

/**
 * @param {App.Platform | undefined} platform
 * @returns {Promise<RenewablesEnvelope>}
 */
export function getHomepageRenewablesCached(platform) {
	return cache.get(platform);
}
