/**
 * Map an Explorer region selection (the `value`s from `$lib/regions.js`) to the
 * OE API network + optional network_region pair.
 *
 * The dropdown exposes a single list mixing NEM-wide, individual NEM regions and
 * WEM, but the OE API splits these across two axes:
 *   - `networkId`     — 'NEM' or 'WEM'
 *   - `networkRegion` — undefined for a whole network, or a region code (NSW1…)
 *
 * `_all` → whole NEM (no region filter); `wem` → whole WEM; everything else is a
 * NEM sub-region (the region value upper-cased, e.g. `nsw1` → `NSW1`).
 */

/**
 * @typedef {Object} NetworkTarget
 * @property {import('openelectricity').NetworkCode} networkId
 * @property {string | undefined} networkRegion
 * @property {string} timeZone - UTC offset string for the network ('+10:00' / '+08:00')
 */

/**
 * @param {string} region - Region value from `regionOptions` (e.g. '_all', 'nsw1', 'wem')
 * @returns {NetworkTarget}
 */
export function regionToNetwork(region) {
	if (region === 'wem') {
		return { networkId: 'WEM', networkRegion: undefined, timeZone: '+08:00' };
	}
	if (region === '_all' || !region) {
		return { networkId: 'NEM', networkRegion: undefined, timeZone: '+10:00' };
	}
	return { networkId: 'NEM', networkRegion: region.toUpperCase(), timeZone: '+10:00' };
}
