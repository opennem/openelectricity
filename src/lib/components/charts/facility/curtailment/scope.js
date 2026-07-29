/**
 * Which regional curtailment series (if any) belongs on a facility's page.
 *
 * Curtailment is published by the OE API only as a *network* market metric,
 * aggregated per region and split by fuel tech — there is no per-facility or
 * per-unit series (`/data/facilities` rejects the metric outright). So the most
 * a facility page can show is the curtailment happening around it: the region's
 * curtailment for the facility's own fuel tech.
 *
 * That series is deliberately NOT attributable to the facility. VIC1 wind
 * curtailment of 100 MW says the region curtailed wind; it may have been
 * entirely other wind farms. The panel presents it as regional context and must
 * never be read as this facility's lost output.
 *
 * Two constraints come from the API and decide whether a page gets a panel:
 *   - curtailment exists on the NEM only (the WEM publishes none)
 *   - it is split into wind and utility solar only — no other fuel tech, and
 *     rooftop solar is excluded
 */

import { getRegionLongLabel } from '$lib/facilities/filters.js';

/**
 * Facility fuel techs the OE API publishes a curtailment split for.
 * @type {Record<string, 'wind' | 'solar'>}
 */
const CURTAILMENT_BY_FUELTECH = {
	wind: 'wind',
	solar_utility: 'solar'
};

/** Curtailment is a NEM-only metric. */
const CURTAILMENT_NETWORK = 'NEM';

/**
 * @typedef {'wind' | 'solar' | 'both'} CurtailmentKind
 */

/** @type {Record<CurtailmentKind, string>} */
const CURTAILMENT_LABELS = {
	wind: 'Wind curtailment',
	solar: 'Solar curtailment',
	both: 'Wind & solar curtailment'
};

/**
 * @typedef {Object} CurtailmentScope
 * @property {CurtailmentKind} kind - Which fuel-tech split(s) apply
 * @property {string} region - Explorer region value for NetworkChart ('vic1'…)
 * @property {string} regionName - Region as shown to the reader ('Victoria')
 * @property {string} label - Panel heading
 * @property {string} note - The non-attribution caveat, for the heading's tooltip
 */

/** Docs page explaining how OE calculates curtailment. */
export const CURTAILMENT_DOCS_HREF = 'https://docs.openelectricity.org.au/guides/curtailment';

/**
 * Resolve the curtailment context for a facility, or null when the page should
 * show no panel at all (WEM, or no wind/utility-solar units).
 *
 * @param {any} facility
 * @returns {CurtailmentScope | null}
 */
export function facilityCurtailmentScope(facility) {
	if (!facility || facility.network_id !== CURTAILMENT_NETWORK) return null;

	const region = facility.network_region;
	if (!region) return null;

	const kinds = new Set(
		(facility.units ?? [])
			.map((/** @type {any} */ unit) => CURTAILMENT_BY_FUELTECH[unit?.fueltech_id])
			.filter(Boolean)
	);

	if (kinds.size === 0) return null;

	/** @type {CurtailmentKind} */
	const kind = kinds.size > 1 ? 'both' : /** @type {CurtailmentKind} */ ([...kinds][0]);

	// Same region-name source every other facility surface reads (the picker bar,
	// cards, map), so a label edit reaches all of them at once.
	const regionName = getRegionLongLabel(facility.network_id, String(region));

	return {
		kind,
		region: String(region).toLowerCase(),
		regionName,
		label: CURTAILMENT_LABELS[kind],
		note:
			`Curtailment is published for ${regionName} as a whole. ` +
			'It is not attributed to this facility, and may be occurring entirely at other sites.'
	};
}

// The kind → `/api/network/data` metric mapping lives with the metric registry
// it has to agree with, in `network/market-metrics.js` — see `curtailmentMetric`.
