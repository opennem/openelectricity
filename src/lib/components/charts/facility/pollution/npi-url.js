/**
 * Build a URL to the National Pollutant Inventory's individual-facility-detail
 * page. The NPI URL pattern (verified from npi.gov.au) is:
 *
 *   https://www.npi.gov.au/npidata/action/load/individual-facility-detail
 *     /criteria/state/{STATE}/year/{YEAR}/jurisdiction-facility/{NPI_ID}
 *
 * `state` is the two- or three-letter Australian jurisdiction code (NSW, VIC,
 * QLD, SA, WA, TAS, NT, ACT). OE's `network_region` is one of NSW1/QLD1/VIC1/
 * SA1/TAS1 for NEM facilities, or `WEM` for the WA market — both map cleanly.
 *
 * @module npi-url
 */

/** @type {Record<string, string>} */
const REGION_TO_STATE = {
	NSW1: 'NSW',
	QLD1: 'QLD',
	VIC1: 'VIC',
	SA1: 'SA',
	TAS1: 'TAS',
	WEM: 'WA'
};

/**
 * @param {string | null | undefined} networkRegion
 * @returns {string | null}
 */
export function networkRegionToNpiState(networkRegion) {
	if (!networkRegion) return null;
	return REGION_TO_STATE[networkRegion] ?? null;
}

/**
 * @param {{ npiId?: string | null, networkRegion?: string | null, year?: string | number | null }} params
 * @returns {string | null}
 */
export function buildNpiFacilityUrl({ npiId, networkRegion, year }) {
	if (!npiId || !networkRegion || !year) return null;
	const state = networkRegionToNpiState(networkRegion);
	if (!state) return null;
	const yearStr = String(year).slice(0, 4);
	return `https://www.npi.gov.au/npidata/action/load/individual-facility-detail/criteria/state/${state}/year/${yearStr}/jurisdiction-facility/${encodeURIComponent(npiId)}`;
}
