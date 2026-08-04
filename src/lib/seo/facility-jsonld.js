/**
 * schema.org JSON-LD for facility pages.
 *
 * schema.org has no power-station type (long-standing gap), so facilities are
 * described as a `Place` with `additionalType` pointing at the matching
 * Wikidata class — the standard workaround for entity disambiguation.
 * Capacity and fuel technology ride along as `PropertyValue` entries since no
 * native schema.org properties exist for them. None of this earns rich
 * results; the value is knowledge-graph association (geo + sameAs links to
 * Wikipedia/Wikidata/OSM).
 */

import { fuelTechNameMap } from '$lib/fuel_techs.js';
import { regionsWithShortLabels } from '$lib/regions.js';
import { EXTERNAL_LINKS } from '$lib/constants/external-links.js';
import { sumUnitCapacities } from '$lib/utils/capacity';
import { primaryFuelTech } from '$lib/utils/fueltech-display';

// Entity URI, deliberately not EXTERNAL_LINKS.wikidata's /wiki/ page URL —
// sameAs/additionalType want the canonical entity form.
export const WIKIDATA_ENTITY = 'http://www.wikidata.org/entity/';

/**
 * Wikidata classes for power-station types, keyed by OE fuel tech. QIDs
 * verified against wikidata.org labels (2026-08): don't add entries without
 * checking — several "obvious" QIDs resolve to unrelated entities.
 * (New fueltech ids fall back to the generic class — see the fueltech-add
 * skill checklist.)
 * @type {Record<string, string>}
 */
const FUELTECH_WIKIDATA_CLASS = {
	coal_black: 'Q6558431', // coal-fired power station
	coal_brown: 'Q6558431',
	coal: 'Q6558431',
	gas_ccgt: 'Q2944640', // gas-fired power station
	gas_ccgt_ccs: 'Q2944640',
	gas_ocgt: 'Q2944640',
	gas_recip: 'Q2944640',
	gas_steam: 'Q2944640',
	gas_wcmg: 'Q2944640',
	gas_hydrogen: 'Q2944640',
	gas: 'Q2944640',
	hydro: 'Q15911738', // hydroelectric power station
	pumps: 'Q339353', // pumped-storage power station
	wind: 'Q194356', // wind farm
	wind_offshore: 'Q194356',
	solar_utility: 'Q1003207', // photovoltaic power station
	solar: 'Q1003207',
	solar_thermal: 'Q285927', // thermal solar power station
	battery: 'Q810924', // battery storage power station
	battery_charging: 'Q810924',
	battery_discharging: 'Q810924',
	bioenergy_biomass: 'Q55364050', // biomass-fired power station
	nuclear: 'Q134447' // nuclear power plant
};

const GENERIC_POWER_STATION = 'Q159719'; // power station

/**
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
function httpUrlOrNull(value) {
	return typeof value === 'string' && /^https?:\/\//.test(value.trim()) ? value.trim() : null;
}

/**
 * Build the JSON-LD graph (Place + BreadcrumbList) for a facility page, for
 * Meta.svelte's `jsonLd` prop (which handles stringifying and escaping).
 * Returns null when there's no facility to describe.
 *
 * @param {Object} args
 * @param {any} args.facility - OE API facility record
 * @param {any} args.sanityFacility - Sanity profile (may be null)
 * @param {string} args.url - absolute canonical page URL
 * @param {string} args.image - absolute OG image URL
 * @param {string} args.description
 * @returns {Record<string, any> | null}
 */
export function buildFacilityJsonLd({ facility, sanityFacility, url, image, description }) {
	if (!facility?.name) return null;

	const units = Array.isArray(facility.units) ? facility.units : [];
	const primaryFt = primaryFuelTech(units);
	const wikidataClass = (primaryFt && FUELTECH_WIKIDATA_CLASS[primaryFt]) || GENERIC_POWER_STATION;

	/** @type {Record<string, any>} */
	const place = {
		'@type': 'Place',
		'@id': `${url}#place`,
		additionalType: `${WIKIDATA_ENTITY}${wikidataClass}`,
		name: facility.name,
		url
	};

	if (description) place.description = description;
	if (image) place.image = image;

	// First location with usable coordinates — a malformed OE location (e.g.
	// null lat/lng) must not shadow a valid Sanity one.
	const location = [facility.location, sanityFacility?.location].find(
		(l) => Number.isFinite(l?.lat) && Number.isFinite(l?.lng)
	);
	if (location) {
		place.geo = {
			'@type': 'GeoCoordinates',
			latitude: location.lat,
			longitude: location.lng
		};
	}

	place.address = { '@type': 'PostalAddress', addressCountry: 'AU' };
	const state = regionsWithShortLabels[(facility.network_region || '').toLowerCase()];
	if (state) place.address.addressRegion = state;

	const wikidataId = (sanityFacility?.wikidata_id ?? '').trim?.() || '';
	const osmWayId = sanityFacility?.osm_way_id;
	const sameAs = [
		httpUrlOrNull(sanityFacility?.wikipedia),
		/^Q\d+$/.test(wikidataId) ? `${WIKIDATA_ENTITY}${wikidataId}` : null,
		osmWayId ? `${EXTERNAL_LINKS.openStreetMap.baseUrl}/way/${osmWayId}` : null,
		httpUrlOrNull(sanityFacility?.website)
	].filter(Boolean);
	if (sameAs.length) place.sameAs = sameAs;

	const additionalProperty = [];
	const capacity = sumUnitCapacities(units);
	if (capacity > 0) {
		additionalProperty.push({
			'@type': 'PropertyValue',
			name: 'Nameplate capacity',
			value: Math.round(capacity * 10) / 10,
			unitText: 'MW'
		});
	}
	const fuelTechLabels = [
		...new Set(
			units.map((/** @type {any} */ u) => fuelTechNameMap[u?.fueltech_id] ?? null).filter(Boolean)
		)
	];
	if (fuelTechLabels.length) {
		additionalProperty.push({
			'@type': 'PropertyValue',
			name: 'Fuel technology',
			value: fuelTechLabels.join(', ')
		});
	}
	if (additionalProperty.length) place.additionalProperty = additionalProperty;

	const origin = new URL(url).origin;
	const breadcrumb = {
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Open Electricity', item: origin },
			{ '@type': 'ListItem', position: 2, name: 'Facilities', item: `${origin}/facilities` },
			{ '@type': 'ListItem', position: 3, name: facility.name, item: url }
		]
	};

	return {
		'@context': 'https://schema.org',
		'@graph': [place, breadcrumb]
	};
}
