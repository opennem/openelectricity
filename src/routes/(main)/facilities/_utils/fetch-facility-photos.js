import { client as sanityClient } from '$lib/sanity.js';

/**
 * Map of facility code → first-photo CDN URL, for the card-grid view. Cached
 * in-process for an hour since facility photos change rarely (mirrors the
 * pattern in `$lib/server/facilities-server-cache.js`).
 *
 * @type {{ data: Record<string, string>, at: number } | null}
 */
let cache = null;
const TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch a `{ [code]: photoUrl }` map of facility photos from Sanity. Returns an
 * empty map (or the last good value) on failure so the card grid degrades to
 * the colour-wash tiles rather than erroring.
 *
 * @returns {Promise<Record<string, string>>}
 */
export async function fetchFacilityPhotos() {
	if (cache && Date.now() - cache.at < TTL) return cache.data;
	try {
		const rows = await sanityClient.fetch(
			`*[_type == "facility" && defined(photos[0])]{ code, "url": photos[0].asset->url }`
		);
		/** @type {Record<string, string>} */
		const map = {};
		for (const row of rows ?? []) {
			if (row?.code && row?.url) map[row.code] = row.url;
		}
		cache = { data: map, at: Date.now() };
		return map;
	} catch {
		return cache?.data ?? {};
	}
}
