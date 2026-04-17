import { error } from '@sveltejs/kit';
import { client as sanityClient } from '$lib/sanity';
import { fetchFacilityByCode } from '$lib/server/opennem/fetch-facility-by-code.js';

const DEFAULT_RANGE_DAYS = 7;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50;

/**
 * @typedef {Object} CacheEntry
 * @property {any} facility
 * @property {any} sanityFacility
 * @property {any} powerData
 * @property {string} timeZone
 * @property {number} expires
 */

// Module-level cache for the full facility page payload. On Cloudflare Workers
// this is per-isolate and not shared across edges — a best-effort speedup for
// rapid list-panel navigation within a single session, not a global cache.
/** @type {Map<string, CacheEntry>} */
const facilityCache = new Map();

/**
 * @param {string} code
 * @param {CacheEntry} entry
 */
function cacheSet(code, entry) {
	// Map iteration preserves insertion order, so the oldest entry is first.
	if (facilityCache.size >= CACHE_MAX_ENTRIES && !facilityCache.has(code)) {
		const oldest = facilityCache.keys().next().value;
		if (oldest !== undefined) facilityCache.delete(oldest);
	}
	facilityCache.delete(code);
	facilityCache.set(code, entry);
}

/**
 * @param {string} code
 * @param {typeof fetch} fetch
 * @returns {Promise<CacheEntry | null>}
 */
async function loadFacilityPayload(code, fetch) {
	const now = Date.now();
	const cached = facilityCache.get(code);
	if (cached && cached.expires > now) return cached;
	if (cached) facilityCache.delete(code);

	const facilityPromise = fetchFacilityByCode(code);
	const sanityPromise = sanityClient
		.fetch(
			`*[_type == "facility" && code == $code][0]{
				_id, code, name, website, wikipedia, wikidata_id, location,
				description, photos,
				owners[]->{_id, name, legal_name, website}
			}`,
			{ code }
		)
		.catch(() => null);

	const [facility, sanityFacility] = await Promise.all([facilityPromise, sanityPromise]);
	if (!facility) return null;

	const timeZone = facility.network_id === 'WEM' ? '+08:00' : '+10:00';

	const powerParams = new URLSearchParams({
		network_id: facility.network_id,
		days: String(DEFAULT_RANGE_DAYS)
	});
	const powerData = await fetch(`/api/facilities/${code}/power?${powerParams.toString()}`)
		.then(async (res) => (res.ok ? (await res.json()).response : null))
		.catch(() => null);

	const entry = {
		facility,
		sanityFacility,
		powerData,
		timeZone,
		expires: now + CACHE_TTL_MS
	};
	cacheSet(code, entry);
	return entry;
}

/**
 * @param {Object} params
 * @param {{ code: string }} params.params
 * @param {typeof fetch} params.fetch
 */
export async function load({ params, fetch }) {
	const { code } = params;

	const payload = await loadFacilityPayload(code, fetch);
	if (!payload) throw error(404, `Facility "${code}" not found`);

	return {
		facility: payload.facility,
		sanityFacility: payload.sanityFacility,
		powerData: payload.powerData,
		timeZone: payload.timeZone,
		rangeDays: DEFAULT_RANGE_DAYS
	};
}
