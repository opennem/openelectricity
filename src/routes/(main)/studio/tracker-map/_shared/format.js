/**
 * Shared presentation helpers for the tracker-map prototypes.
 *
 * Pure formatting/guard functions used by the shared map layers and each
 * prototype's dock — kept together so the price chips, badges and stat tiles
 * all render identically.
 */

/**
 * '$87' / '-$12' — any '/MWh' suffix renders separately at the call site.
 * @param {number} value
 * @returns {string}
 */
export function formatPrice(value) {
	const rounded = Math.round(value);
	return rounded < 0 ? `-$${Math.abs(rounded)}` : `$${rounded}`;
}

/**
 * Black or white text for legibility on a price-chip background.
 *
 * Perceptual luma (ITU-R BT.709) with a 140 threshold — the price-scale
 * quantile greys split cleanly here. Deliberately NOT
 * `getContrastedTextColour` from `$lib/colours.js`: its WCAG ≥3:1 rule flips
 * #91918F (the $100–$300 band) to white at 3.1:1, where black reads better at
 * the chips' 10px size.
 * @param {string} background - Hex colour like '#RRGGBB'
 * @returns {string}
 */
export function contrastText(background) {
	const n = parseInt(background.slice(1), 16);
	const r = (n >> 16) & 255;
	const g = (n >> 8) & 255;
	const b = n & 255;
	return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140 ? '#000000' : '#ffffff';
}

/**
 * Display label — region codes minus the market suffix digit (NSW1 → NSW).
 * @param {string} regionCode
 * @returns {string}
 */
export function displayCode(regionCode) {
	return regionCode.replace(/\d+$/, '');
}

/**
 * Finite-number guard for live data lookups (flows/prices maps).
 * @param {number | null | undefined} x
 * @returns {number | undefined}
 */
export function numberOrUndefined(x) {
	return typeof x === 'number' && Number.isFinite(x) ? x : undefined;
}
