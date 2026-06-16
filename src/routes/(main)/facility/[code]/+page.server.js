import { error } from '@sveltejs/kit';
import { building } from '$app/environment';
import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { client as sanityClient } from '$lib/sanity';
import { fetchFacilityByCode } from '$lib/server/opennem/fetch-facility-by-code.js';
import { CHARTS_FRACTION_DEFAULT } from './_utils/charts-fraction.js';

const DEFAULT_RANGE_DAYS = 7;

// Per-facility OG card, generated at build time (scripts/generate-og-images.mjs)
// and served as a static asset. Absolute URL so it's valid in the prerendered HTML.
const OG_IMAGE_BASE = 'https://openelectricity.org.au/og/facility';

// Static identity only — power/market/emissions series are time-sensitive and
// fetched client-side (see +page.svelte), so the page can be prerendered.
const SANITY_FACILITY_PROJECTION = `{
	_id, code, name, website, wikipedia, wikidata_id, location,
	description, photos,
	owners[]->{_id, name, legal_name, website}
}`;

// Prerender every facility as a static identity shell. The interactive charts
// hydrate client-side, so nothing time-sensitive is baked in. Metadata is
// deploy-fresh (Cloudflare Pages has no on-demand revalidation).
export const prerender = true;

/** @type {OpenElectricityClient | null} */
let oeClient = null;
function getOeClient() {
	if (!oeClient) {
		oeClient = new OpenElectricityClient({ apiKey: PUBLIC_OE_API_KEY, baseUrl: PUBLIC_OE_API_URL });
	}
	return oeClient;
}

// ---------------------------------------------------------------------------
// Build-time bulk memos. During prerender `load` runs once per facility code,
// so without these the build would make N OE + N Sanity calls. Each memo fetches
// the whole set once and serves every page from the resulting map.
// ---------------------------------------------------------------------------

/** @type {Promise<Map<string, any>> | null} */
let facilitiesMapPromise = null;
function getFacilitiesMap() {
	if (!facilitiesMapPromise) {
		facilitiesMapPromise = getOeClient()
			.getFacilities()
			.then((r) => {
				/** @type {Map<string, any>} */
				const map = new Map();
				for (const f of r.response.data || []) {
					if (f?.code) map.set(f.code, f);
				}
				return map;
			})
			.catch(() => /** @type {Map<string, any>} */ (new Map()));
	}
	return facilitiesMapPromise;
}

/** @type {Promise<Map<string, any>> | null} */
let sanityMapPromise = null;
function getSanityMap() {
	if (!sanityMapPromise) {
		sanityMapPromise = sanityClient
			.fetch(`*[_type == "facility" && defined(code)]${SANITY_FACILITY_PROJECTION}`)
			.then((/** @type {any[]} */ docs) => {
				/** @type {Map<string, any>} */
				const map = new Map();
				for (const d of docs || []) {
					if (d?.code) map.set(d.code, d);
				}
				return map;
			})
			.catch(() => /** @type {Map<string, any>} */ (new Map()));
	}
	return sanityMapPromise;
}

/** Enumerate every facility code so each gets prerendered to a static page. */
export async function entries() {
	const map = await getFacilitiesMap();
	return [...map.keys()].map((code) => ({ code }));
}

/**
 * Retired facilities have no data near "now" — anchor the default chart window
 * to the latest `data_last_seen` across units (or the latest `closure_date` when
 * no unit has data) so the page surfaces the final operating period instead of an
 * empty range. Pure: no network, safe to run at build time.
 *
 * @param {any} facility
 * @returns {number | null}
 */
function computeRetiredEndMs(facility) {
	const units = Array.isArray(facility.units) ? facility.units : [];
	const isFullyRetired =
		units.length > 0 && units.every((/** @type {any} */ u) => u.status_id === 'retired');
	if (!isFullyRetired) return null;

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
	if (!anchor) return null;

	const t = new Date(anchor).getTime();
	return Number.isFinite(t) ? t : null;
}

/**
 * Flatten Sanity Portable Text to a plain string for meta descriptions.
 * @param {any} blocks
 * @returns {string}
 */
function portableTextToPlain(blocks) {
	if (!Array.isArray(blocks)) return '';
	return blocks
		.filter((b) => b?._type === 'block' && Array.isArray(b.children))
		.map((b) => b.children.map((/** @type {any} */ c) => c?.text ?? '').join(''))
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Open Graph description: the editorial summary when present, else a templated
 * line built from the facility's identity.
 * @param {any} facility
 * @param {any} sanityFacility
 * @returns {string}
 */
function buildOgDescription(facility, sanityFacility) {
	const plain = portableTextToPlain(sanityFacility?.description);
	if (plain) return plain.length > 200 ? plain.slice(0, 199).trimEnd() + '…' : plain;

	const units = Array.isArray(facility.units) ? facility.units : [];
	const capacity = units.reduce(
		(/** @type {number} */ sum, /** @type {any} */ u) =>
			sum + (Number(u.capacity_maximum ?? u.capacity_registered) || 0),
		0
	);
	const capStr = capacity ? `${Math.round(capacity).toLocaleString('en-AU')} MW ` : '';
	const region = (facility.network_region || '').toUpperCase();
	const where = region ? ` in ${region}` : '';
	return `${facility.name} — ${capStr}power facility${where}. Track live generation, capacity and market data on Open Electricity.`;
}

/**
 * @param {Object} params
 * @param {{ code: string }} params.params
 */
export async function load({ params }) {
	const { code } = params;

	// At build, read identity + editorial from the bulk memos (one OE + one Sanity
	// call for the whole prerender). In dev/SSR, fetch per-code so visiting a single
	// facility doesn't pull the entire dataset.
	/** @type {any} */
	let facility;
	/** @type {any} */
	let sanityFacility;
	if (building) {
		const [fMap, sMap] = await Promise.all([getFacilitiesMap(), getSanityMap()]);
		facility = fMap.get(code) ?? (await fetchFacilityByCode(code));
		sanityFacility = sMap.get(code) ?? null;
	} else {
		[facility, sanityFacility] = await Promise.all([
			fetchFacilityByCode(code),
			sanityClient
				.fetch(`*[_type == "facility" && code == $code][0]${SANITY_FACILITY_PROJECTION}`, { code })
				.catch(() => null)
		]);
	}

	if (!facility) throw error(404, `Facility "${code}" not found`);

	const timeZone = facility.network_id === 'WEM' ? '+08:00' : '+10:00';

	return {
		facility,
		sanityFacility,
		timeZone,
		retiredEndMs: computeRetiredEndMs(facility),
		rangeDays: DEFAULT_RANGE_DAYS,
		ogImage: `${OG_IMAGE_BASE}/${code}.jpg`,
		ogDescription: buildOgDescription(facility, sanityFacility),
		// Split width is restored client-side from the cookie (the prerendered page
		// can't read request cookies); the chart self-fetches its series on mount.
		chartsFraction: CHARTS_FRACTION_DEFAULT,
		powerData: null
	};
}
