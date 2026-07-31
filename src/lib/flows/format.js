/**
 * Shared presentation helpers for the tracker map.
 *
 * Pure formatting/guard functions used by the shared map layers and the
 * interconnector panel — kept together so the price chips and stat rows all
 * render identically.
 */

import { regionsWithShortLabels } from '$lib/regions.js';
import { formatDateTime } from '$lib/utils/formatters.js';

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
 * Corridor identity colour — the arcs' base stroke, the chart flow line and
 * the capacity bars all read as one system through this single value.
 */
export const CORRIDOR_COLOUR = '#5f7690';

/**
 * Display label for a region code, backed by the shared region registry so
 * chips and chart labels can't drift ('NSW1' → 'NSW').
 * @param {string} regionCode
 * @returns {string}
 */
export function displayCode(regionCode) {
	return regionsWithShortLabels[regionCode.toLowerCase()] ?? regionCode;
}

/**
 * "10:35 am, 31 Jul" — the shared "as at" dispatch-time treatment for the
 * corridor list footer and the detail stat block.
 * @param {string} dispatchDateTimeString - ISO string from the flows payload
 * @returns {string} Empty when the input is absent/invalid
 */
export function formatDispatchLabel(dispatchDateTimeString) {
	if (!dispatchDateTimeString) return '';
	return formatDateTime({
		date: new Date(dispatchDateTimeString),
		hour: 'numeric',
		minute: 'numeric',
		day: 'numeric',
		month: 'short',
		timeZone: '+10:00'
	});
}

/**
 * Finite-number guard for live data lookups (flows/prices maps).
 * @param {number | null | undefined} x
 * @returns {number | undefined}
 */
export function numberOrUndefined(x) {
	return typeof x === 'number' && Number.isFinite(x) ? x : undefined;
}
