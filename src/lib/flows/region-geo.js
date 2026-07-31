/**
 * Hand-authored geography for the NEM interconnectors.
 *
 * The OE APIs carry no geometry: interconnector flows are keyed by directed
 * pair (see `$lib/flows/derive-pairwise.js`) and regions are just codes. This
 * module pins those to the map — one badge anchor per region, and per corridor
 * a straight anchor-to-anchor connector (see {@link corridorCoords}) plus the
 * point where that connector crosses the state border, which anchors the flow
 * label. Coordinates are [lng, lat]. The physical routes are deliberately NOT
 * traced — the map reads flows as "power moving from this state to that one",
 * with the real line geometry left to the transmission layer.
 *
 * Capacity figures are per-direction nominal transfer capabilities, summed
 * over the corridor's physical links, from AEMO's Interconnector Capabilities
 * document, September 2025 edition (see
 * {@link INTERCONNECTOR_CAPABILITY_HREF}). Nominal only — the real limits are
 * recalculated every dispatch interval from network constraints, so treat the
 * utilisation fraction as indicative.
 *
 * CAUTION: AEMO's September 2025 Interconnector Capabilities edition records
 * Project EnergyConnect stage 1 (SA–NSW, 150 MW each way) as commissioned.
 * PEC closes the NSW–VIC–SA cycle, which compromises the tree-topology flow
 * derivation in derive-pairwise.js — any PEC flow is misattributed to the
 * SA–VIC and NSW–VIC corridors. This registry is the single place to extend
 * once the OE API grows a pairwise metric (PEC's transmission-line features
 * are objectids 3059–3062, currently excluded).
 */

import { displayCode } from './format.js';

/** Price-chip anchor per NEM region. @type {Record<string, [number, number]>} */
export const REGION_ANCHORS = {
	NSW1: [147.5, -32.8],
	QLD1: [146.5, -23.5],
	SA1: [135.8, -30.3],
	TAS1: [146.6, -42.1],
	VIC1: [143.9, -36.9]
};

/**
 * @typedef {Object} InterconnectorDef
 * @property {string} key - Directed flow key as served by /api/flows
 * @property {string} from - Exporting region when the flow is positive
 * @property {string} to - Importing region when the flow is positive
 * @property {string} label - Human-readable name
 * @property {{ forward: number, reverse: number }} capacityMW - AEMO nominal
 *   transfer capability (MW): `forward` along the key direction (from -> to),
 *   `reverse` against it
 * @property {[number, number]} borderPoint - Where the straight anchor-to-anchor
 *   connector crosses the state border (Bass Strait midpoint for Basslink) —
 *   anchors the corridor's flow label
 * @property {number[]} objectids - Physical line features in
 *   `/data/transmission-lines.geojson` making up the corridor (matched by
 *   `objectid` — the data has no interconnector flag)
 */

/** @type {InterconnectorDef[]} */
export const INTERCONNECTORS = [
	{
		key: 'NSW1->QLD1',
		from: 'NSW1',
		to: 'QLD1',
		label: 'New South Wales – Queensland',
		// QNI 850/1400 + Terranora 107/210 (NSW->QLD / QLD->NSW)
		capacityMW: { forward: 957, reverse: 1610 },
		borderPoint: [147.1, -29.0],
		// QNI (Bulli Creek–Dumaresq pair) + Directlink (Terranora–Mudgeeraba)
		objectids: [1807, 1798, 1912]
	},
	{
		key: 'NSW1->VIC1',
		from: 'NSW1',
		to: 'VIC1',
		label: 'New South Wales – Victoria',
		// VNI is heavily condition-dependent — AEMO quotes 400-1900 NSW->VIC /
		// 400-1700 VIC->NSW; the upper nominals are used here.
		capacityMW: { forward: 1900, reverse: 1700 },
		// Nudged up the connector from the Murray crossing (~[144.7, -36.0]) so
		// the flow box sits clear of the VIC price chip.
		borderPoint: [145.2, -35.4],
		// Wodonga–Jindera + Murray–Dederang pair
		objectids: [301, 328, 327]
	},
	{
		key: 'SA1->VIC1',
		from: 'SA1',
		to: 'VIC1',
		label: 'South Australia – Victoria',
		// Heywood 550/600 (SA->VIC current testing limit / VIC->SA) +
		// Murraylink 200/220
		capacityMW: { forward: 750, reverse: 820 },
		borderPoint: [141.0, -34.5],
		// Heywood (Heywood Terminal–South East) + Murraylink (Monash–Red Cliffs)
		objectids: [691, 725]
	},
	{
		key: 'TAS1->VIC1',
		from: 'TAS1',
		to: 'VIC1',
		label: 'Tasmania – Victoria',
		// Basslink 594 TAS->VIC / 478 VIC->TAS
		capacityMW: { forward: 594, reverse: 478 },
		borderPoint: [145.3, -39.5],
		// Basslink cable + its Loy Yang / George Town feeders
		objectids: [751, 340, 956]
	}
];

/**
 * The corridor's straight connector, ordered from -> to (the key direction):
 * region anchor to region anchor. Also the bounds the corridor zoom frames —
 * both region centres in view, border in the middle.
 * @param {InterconnectorDef} interconnector
 * @returns {[[number, number], [number, number]]}
 */
export function corridorCoords(interconnector) {
	return [REGION_ANCHORS[interconnector.from], REGION_ANCHORS[interconnector.to]];
}

/**
 * Interconnectors touching a region (either end).
 * @param {string} regionCode
 * @returns {InterconnectorDef[]}
 */
export function interconnectorsForRegion(regionCode) {
	return INTERCONNECTORS.filter((ic) => ic.from === regionCode || ic.to === regionCode);
}

/**
 * Corridor definition by its directed flow key, or undefined.
 * @param {string | null | undefined} key
 * @returns {InterconnectorDef | undefined}
 */
export function getInterconnector(key) {
	return INTERCONNECTORS.find((ic) => ic.key === key);
}

/** Flows below this (MW) are treated as effectively idle — direction is meaningless at ~0 MW. */
export const NEAR_ZERO_MW = 10;

/** AEMO's Interconnector Capabilities document (September 2025 edition) —
 *  the source of the nominal per-direction capability figures, credited from
 *  the corridor panel. The media path says 2024 but serves the current
 *  edition; verified live 31 Jul 2026. */
export const INTERCONNECTOR_CAPABILITY_HREF =
	'https://www.aemo.com.au/-/media/files/electricity/nem/security_and_reliability/congestion-information/2024/interconnector-capabilities.pdf';

/**
 * Live-status quadruple for a corridor from the flows snapshot — the single
 * derivation behind every stat row (list rows, detail block).
 * `capacity` (and the fraction it feeds) is direction-aware: the nominal
 * capability of whichever direction the corridor is currently flowing.
 * @param {Record<string, number | null | undefined>} flows
 * @param {InterconnectorDef} interconnector
 * @returns {{ value: number | undefined, mw: number | undefined, idle: boolean, capacity: number, fraction: number }}
 */
export function corridorLiveStatus(flows, interconnector) {
	const raw = flows?.[interconnector.key];
	const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
	const mw = value !== undefined ? Math.abs(value) : undefined;
	const capacity =
		value !== undefined && value < 0
			? interconnector.capacityMW.reverse
			: interconnector.capacityMW.forward;
	return {
		value,
		mw,
		idle: mw === undefined || mw < NEAR_ZERO_MW,
		capacity,
		fraction: mw !== undefined ? Math.min(1, mw / capacity) : 0
	};
}

/**
 * "VIC1 → NSW1" with the arrow following the actual flow (negative values
 * reverse the key's from→to direction). `short` renders display codes
 * ("VIC → NSW") — the map flow boxes' treatment, kept here so the panel and
 * the map can never caption the same corridor differently.
 * @param {InterconnectorDef} interconnector
 * @param {number} mw
 * @param {{ short?: boolean }} [options]
 * @returns {string}
 */
export function directionLabel(interconnector, mw, { short = false } = {}) {
	const [from, to] =
		mw >= 0 ? [interconnector.from, interconnector.to] : [interconnector.to, interconnector.from];
	return short ? `${displayCode(from)} → ${displayCode(to)}` : `${from} → ${to}`;
}

/**
 * URL slug for a corridor key: 'NSW1->QLD1' → 'nsw1-qld1'.
 * @param {string} key
 * @returns {string}
 */
export function icSlug(key) {
	return key.toLowerCase().replace('->', '-');
}

/**
 * Reverse of {@link icSlug} — resolves a `?ic=` slug back to a corridor key.
 * @param {string | null} slug
 * @returns {string | null} The corridor key, or null for unknown/absent slugs
 */
export function icFromSlug(slug) {
	if (!slug) return null;
	const match = INTERCONNECTORS.find((ic) => icSlug(ic.key) === slug.toLowerCase());
	return match ? match.key : null;
}
