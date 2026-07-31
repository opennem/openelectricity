/**
 * Hand-authored geography for the NEM interconnectors.
 *
 * The OE APIs carry no geometry: interconnector flows are keyed by directed
 * pair (see `$lib/flows/derive-pairwise.js`) and regions are just codes. This
 * module pins those to the map — badge anchors and 3–8-point corridors traced
 * along the real interconnector routes. Coordinates are [lng, lat]; corridor
 * point order follows the key direction (A->B), so a negative flow renders by
 * walking the line in reverse.
 *
 * Capacity figures are prototype-grade constants for normalising arc widths —
 * not authoritative data.
 *
 * When Project EnergyConnect (SA–NSW) energises it closes the NSW–VIC–SA
 * cycle, breaking the tree-topology flow derivation — this registry is the
 * single place to extend once the OE API grows a pairwise metric (its
 * transmission-line features are objectids 3059–3062, currently excluded).
 */

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
 * @property {number} capacityMW - Approximate nominal capacity (for width scaling)
 * @property {[number, number][]} path - Corridor LineString, ordered from -> to
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
		label: 'QNI (NSW–QLD)',
		capacityMW: 1300,
		path: [
			[151.0, -32.4],
			[151.3, -31.2],
			[151.5, -30.0],
			[151.7, -28.8],
			[151.6, -27.6],
			[151.2, -26.9]
		],
		// QNI (Bulli Creek–Dumaresq pair) + Directlink (Terranora–Mudgeeraba)
		objectids: [1807, 1798, 1912]
	},
	{
		key: 'NSW1->VIC1',
		from: 'NSW1',
		to: 'VIC1',
		label: 'VNI (NSW–VIC)',
		capacityMW: 1700,
		path: [
			[147.9, -34.8],
			[147.4, -35.5],
			[147.0, -36.1],
			[146.5, -36.6],
			[145.6, -37.2]
		],
		// Wodonga–Jindera + Murray–Dederang pair
		objectids: [301, 328, 327]
	},
	{
		key: 'SA1->VIC1',
		from: 'SA1',
		to: 'VIC1',
		label: 'Heywood (SA–VIC)',
		capacityMW: 870,
		path: [
			[138.8, -35.2],
			[139.8, -36.1],
			[140.8, -37.3],
			[141.6, -38.0],
			[142.8, -38.1],
			[143.9, -37.9]
		],
		// Heywood (Heywood Terminal–South East) + Murraylink (Monash–Red Cliffs)
		objectids: [691, 725]
	},
	{
		key: 'TAS1->VIC1',
		from: 'TAS1',
		to: 'VIC1',
		label: 'Basslink (TAS–VIC)',
		capacityMW: 500,
		path: [
			[146.9, -41.1],
			[147.0, -40.2],
			[146.8, -39.2],
			[146.6, -38.5]
		],
		// Basslink cable + its Loy Yang / George Town feeders
		objectids: [751, 340, 956]
	}
];

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

/**
 * Live-status quadruple for a corridor from the flows snapshot — the single
 * derivation behind every stat row (list rows, detail block).
 * @param {Record<string, number | null | undefined>} flows
 * @param {InterconnectorDef} interconnector
 * @returns {{ value: number | undefined, mw: number | undefined, idle: boolean, fraction: number }}
 */
export function corridorLiveStatus(flows, interconnector) {
	const raw = flows?.[interconnector.key];
	const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
	const mw = value !== undefined ? Math.abs(value) : undefined;
	return {
		value,
		mw,
		idle: mw === undefined || mw < NEAR_ZERO_MW,
		fraction: mw !== undefined ? Math.min(1, mw / interconnector.capacityMW) : 0
	};
}

/**
 * "VIC1 → NSW1" with the arrow following the actual flow (negative values
 * reverse the key's from→to direction).
 * @param {InterconnectorDef} interconnector
 * @param {number} mw
 * @returns {string}
 */
export function directionLabel(interconnector, mw) {
	return mw >= 0
		? `${interconnector.from} → ${interconnector.to}`
		: `${interconnector.to} → ${interconnector.from}`;
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
