/**
 * Focus stack model + URL codec for the "Focus" tracker-map prototype.
 *
 * The dashboard is always ABOUT one focus object — the whole NEM, one region,
 * or one facility inside a region. The stack is strictly hierarchical
 * (NEM → region → facility), so a single object describes the entire path.
 *
 * URL codec — `?focus=` carries colon-separated tokens, level first:
 *
 *   (absent)                      → { level: 'nem' }
 *   ?focus=region:SA1             → { level: 'region', region: 'SA1' }
 *   ?focus=facility:SA1:TORRENS   → { level: 'facility', region: 'SA1', code: 'TORRENS' }
 *
 * Colons are safe separators: region codes are fixed NEM identifiers and OE
 * facility codes are colon-free (uppercase alphanumerics with `_`/`-`). The
 * facility NAME is deliberately not encoded — codes are canonical and stable,
 * names are display data resolved lazily from the facilities list or the
 * single-facility fetch. Anything malformed degrades to the NEM root.
 */

/** @typedef {{ level: 'nem' }} NemFocus */
/** @typedef {{ level: 'region', region: string }} RegionFocus */
/** @typedef {{ level: 'facility', region: string, code: string }} FacilityFocus */
/** @typedef {NemFocus | RegionFocus | FacilityFocus} Focus */

/** NEM regions the stack can focus (WEM has no flows/prices in this feed). */
export const FOCUS_REGIONS = ['NSW1', 'QLD1', 'SA1', 'TAS1', 'VIC1'];

/**
 * @param {string | null | undefined} code
 * @returns {boolean}
 */
export function isFocusRegion(code) {
	return typeof code === 'string' && FOCUS_REGIONS.includes(code);
}

/**
 * Parse a `?focus=` param into a Focus, falling back to the NEM root.
 * @param {string | null | undefined} raw
 * @returns {Focus}
 */
export function parseFocusParam(raw) {
	if (!raw) return { level: 'nem' };
	const [level, regionToken, codeToken] = raw.split(':');
	const region = (regionToken ?? '').toUpperCase();
	if (level === 'region' && isFocusRegion(region)) {
		return { level: 'region', region };
	}
	if (level === 'facility' && isFocusRegion(region) && codeToken) {
		return { level: 'facility', region, code: codeToken };
	}
	return { level: 'nem' };
}

/**
 * Encode a Focus for the URL. The NEM root encodes as `null` (param omitted)
 * so the clean route URL stays the canonical "nothing focused" state.
 * @param {Focus} focus
 * @returns {string | null}
 */
export function encodeFocus(focus) {
	if (focus.level === 'region') return `region:${focus.region}`;
	if (focus.level === 'facility') return `facility:${focus.region}:${focus.code}`;
	return null;
}

/**
 * The region a focus points at, or null at the NEM root.
 * @param {Focus} focus
 * @returns {string | null}
 */
export function focusRegionOf(focus) {
	return focus.level === 'nem' ? null : focus.region;
}
