/**
 * Hand-authored geography for the tracker-map prototypes.
 *
 * The OE APIs carry no geometry: interconnector flows are keyed by directed
 * pair (see `$lib/flows/process-flows.js`) and regions are just codes. This
 * module pins those to the map — badge anchors, camera bounds, and 3–8-point
 * corridors traced along the real interconnector routes. Coordinates are
 * [lng, lat]; corridor point order follows the key direction (A->B), so a
 * negative flow renders by walking the line in reverse.
 *
 * Capacity/peak figures are prototype-grade constants for normalising arc
 * widths and badge gauges — not authoritative data.
 */

/** Badge/label anchor per region. @type {Record<string, [number, number]>} */
export const REGION_ANCHORS = {
	NSW1: [147.5, -32.8],
	QLD1: [146.5, -23.5],
	SA1: [135.8, -30.3],
	TAS1: [146.6, -42.1],
	VIC1: [143.9, -36.9],
	WEM: [117.9, -31.2]
};

/**
 * Camera bounds per region (south-west, north-east), padded for a side dock.
 * @type {Record<string, [[number, number], [number, number]]>}
 */
export const REGION_BOUNDS = {
	NSW1: [
		[141.0, -37.6],
		[153.7, -28.1]
	],
	QLD1: [
		[141.0, -29.2],
		[153.6, -16.0]
	],
	SA1: [
		[129.0, -38.1],
		[141.0, -26.0]
	],
	TAS1: [
		[144.5, -43.7],
		[148.5, -40.6]
	],
	VIC1: [
		[140.9, -39.2],
		[150.0, -33.9]
	],
	WEM: [
		[114.9, -35.2],
		[121.9, -27.0]
	]
};

/** National framing: the NEM's eastern seaboard states + Tasmania. */
export const NEM_BOUNDS = /** @type {[[number, number], [number, number]]} */ ([
	[133.0, -44.0],
	[154.5, -15.5]
]);

/** Continental framing including the WEM. */
export const AU_BOUNDS = /** @type {[[number, number], [number, number]]} */ ([
	[112.5, -44.5],
	[154.5, -10.5]
]);

/**
 * @typedef {Object} InterconnectorDef
 * @property {string} key - Directed flow key as served by /api/flows
 * @property {string} from - Exporting region when the flow is positive
 * @property {string} to - Importing region when the flow is positive
 * @property {string} label - Human-readable name
 * @property {number} capacityMW - Approximate nominal capacity (for width scaling)
 * @property {[number, number][]} path - Corridor LineString, ordered from -> to
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
		]
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
		]
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
		]
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
		]
	}
];

/**
 * Approximate recent peak demand per region (MW) — scales badge demand gauges.
 * @type {Record<string, number>}
 */
export const REGION_TYPICAL_PEAK_MW = {
	NSW1: 14000,
	QLD1: 10500,
	SA1: 3300,
	TAS1: 1800,
	VIC1: 9500,
	WEM: 4200
};

/**
 * Interconnectors touching a region (either end).
 * @param {string} regionCode
 * @returns {InterconnectorDef[]}
 */
export function interconnectorsForRegion(regionCode) {
	return INTERCONNECTORS.filter((ic) => ic.from === regionCode || ic.to === regionCode);
}

/** Flows below this (MW) are treated as effectively idle — direction is meaningless at ~0 MW. */
export const NEAR_ZERO_MW = 10;

/**
 * The receiving region of a corridor for a signed flow: positive flows run
 * the key's from→to direction, negative flows reverse it.
 * @param {InterconnectorDef} interconnector
 * @param {number} mw
 * @returns {string}
 */
export function flowDestination(interconnector, mw) {
	return mw >= 0 ? interconnector.to : interconnector.from;
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
