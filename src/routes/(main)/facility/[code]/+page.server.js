import { error } from '@sveltejs/kit';
import { client as sanityClient } from '$lib/sanity';
import { SANITY_FACILITY_PROFILE_PROJECTION } from '$lib/server/sanity-projections.js';
import { fetchFacilityByCode } from '$lib/server/opennem/fetch-facility-by-code.js';
import { retiredAnchorMs } from '$lib/components/charts/facility/data-end.js';
import { CHARTS_FRACTION_DEFAULT } from './_utils/charts-fraction.js';
import facilityCardCodes from '$lib/server/og/facility-card-codes.json';

const DEFAULT_RANGE_DAYS = 3;

const SITE = 'https://openelectricity.org.au';

// Per-facility OG cards are generated out-of-band (scripts/generate-og-images.mjs,
// committed under static/og/facility) and served as static assets. Absolute URLs
// so they're valid in the social-card metadata.
const OG_IMAGE_BASE = `${SITE}/og/facility`;

// A facility added since the last card regeneration has no card yet — fall back to
// the site default so crawlers never get a 404 (broken preview). `facility-card-codes.json`
// is the committed manifest of codes that DO have a card (regenerated alongside the cards).
const DEFAULT_OG_IMAGE = `${SITE}/img/preview.jpg`;
const FACILITY_CARD_CODES = new Set(facilityCardCodes);

// Rendered on demand (SSR) rather than prerendered: prerendering all ~600
// facilities blew the Cloudflare build time limit. The page is identity-only and
// the interactive charts hydrate client-side, so the SSR output is cacheable at
// the edge (see the Cache-Control header in load).
export const prerender = false;

/**
 * Retired facilities have no data near "now" — anchor the default chart window
 * to the latest `data_last_seen` across units (or the latest `closure_date` when
 * no unit has data) so the page surfaces the final operating period instead of an
 * empty range. Null (not retired / no anchor) rather than a server-side "now" —
 * the SSR payload is edge-cached and must not bake a timestamp in.
 *
 * @param {any} facility
 * @returns {number | null}
 */
function computeRetiredEndMs(facility) {
	return retiredAnchorMs(Array.isArray(facility.units) ? facility.units : []);
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
 * @param {Object} args
 * @param {{ code: string }} args.params
 * @param {(headers: Record<string, string>) => void} args.setHeaders
 */
export async function load({ params, setHeaders }) {
	const { code } = params;

	const [facility, sanityFacility] = await Promise.all([
		fetchFacilityByCode(code),
		sanityClient
			.fetch(`*[_type == "facility" && code == $code][0]${SANITY_FACILITY_PROFILE_PROJECTION}`, {
				code
			})
			.catch(() => null)
	]);

	if (!facility) throw error(404, `Facility "${code}" not found`);

	const timeZone = facility.network_id === 'WEM' ? '+08:00' : '+10:00';

	// Identity-only payload (nothing request-specific or time-sensitive baked in),
	// so the SSR HTML is safe to cache at the edge — approximating the previous
	// prerendered behaviour while keeping the build fast.
	setHeaders({ 'cache-control': 'public, max-age=3600' });

	return {
		facility,
		sanityFacility,
		timeZone,
		retiredEndMs: computeRetiredEndMs(facility),
		rangeDays: DEFAULT_RANGE_DAYS,
		ogImage: FACILITY_CARD_CODES.has(code) ? `${OG_IMAGE_BASE}/${code}.jpg` : DEFAULT_OG_IMAGE,
		ogDescription: buildOgDescription(facility, sanityFacility),
		// Split width is restored client-side from the cookie; the chart self-fetches
		// its series on mount.
		chartsFraction: CHARTS_FRACTION_DEFAULT,
		powerData: null
	};
}
