import { error } from '@sveltejs/kit';
import { client as sanityClient } from '$lib/sanity';
import { fetchFacilityByCode } from '$lib/server/opennem/fetch-facility-by-code.js';
import {
	CHARTS_FRACTION_COOKIE,
	CHARTS_FRACTION_DEFAULT,
	CHARTS_FRACTION_MIN,
	CHARTS_FRACTION_MAX
} from './_utils/charts-fraction.js';

const DEFAULT_RANGE_DAYS = 7;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50;

/**
 * @typedef {Object} CacheEntry
 * @property {any} facility
 * @property {any} sanityFacility
 * @property {any} powerData
 * @property {string} timeZone
 * @property {number | null} retiredEndMs
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

	// Retired facilities have no data near "now" — anchor the default chart
	// window to the latest `data_last_seen` across units (or the latest
	// `closure_date` when no unit has data) so we surface the final operating
	// period instead of an empty range.
	const units = Array.isArray(facility.units) ? facility.units : [];
	const isFullyRetired =
		units.length > 0 && units.every((/** @type {any} */ u) => u.status_id === 'retired');
	/** @type {number | null} */
	let retiredEndMs = null;
	if (isFullyRetired) {
		/** @type {string | null} */
		let anchor = null;
		for (const u of units) {
			const d = u.data_last_seen;
			if (!d) continue;
			if (!anchor || d > anchor) anchor = d;
		}
		if (!anchor) {
			for (const u of units) {
				const d = u.closure_date;
				if (!d) continue;
				if (!anchor || d > anchor) anchor = d;
			}
		}
		if (anchor) {
			const t = new Date(anchor).getTime();
			if (Number.isFinite(t)) retiredEndMs = t;
		}
	}

	const powerParams = new URLSearchParams({
		network_id: facility.network_id
	});
	if (retiredEndMs != null) {
		const endIso = new Date(retiredEndMs).toISOString().slice(0, 19);
		const startIso = new Date(retiredEndMs - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)
			.toISOString()
			.slice(0, 19);
		powerParams.set('date_start', startIso);
		powerParams.set('date_end', endIso);
	} else {
		powerParams.set('days', String(DEFAULT_RANGE_DAYS));
	}
	const powerData = await fetch(`/api/facilities/${code}/power?${powerParams.toString()}`)
		.then(async (res) => (res.ok ? (await res.json()).response : null))
		.catch(() => null);

	const entry = {
		facility,
		sanityFacility,
		powerData,
		timeZone,
		retiredEndMs,
		expires: now + CACHE_TTL_MS
	};
	cacheSet(code, entry);
	return entry;
}

/**
 * @param {Object} params
 * @param {{ code: string }} params.params
 * @param {typeof fetch} params.fetch
 * @param {import('@sveltejs/kit').Cookies} params.cookies
 */
export async function load({ params, fetch, cookies }) {
	const { code } = params;

	const payload = await loadFacilityPayload(code, fetch);
	if (!payload) throw error(404, `Facility "${code}" not found`);

	const rawFraction = cookies.get(CHARTS_FRACTION_COOKIE);
	const parsedFraction = rawFraction ? parseFloat(rawFraction) : NaN;
	const chartsFraction =
		Number.isFinite(parsedFraction) &&
		parsedFraction >= CHARTS_FRACTION_MIN &&
		parsedFraction <= CHARTS_FRACTION_MAX
			? parsedFraction
			: CHARTS_FRACTION_DEFAULT;

	return {
		facility: payload.facility,
		sanityFacility: payload.sanityFacility,
		powerData: payload.powerData,
		timeZone: payload.timeZone,
		retiredEndMs: payload.retiredEndMs,
		rangeDays: DEFAULT_RANGE_DAYS,
		chartsFraction
	};
}
