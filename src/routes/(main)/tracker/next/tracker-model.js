/**
 * Pure state helpers for the tracker page — mode normalisation and the
 * region-dependent price-mode resolution. Kept out of the components so the
 * rules are unit-testable.
 */

import {
	getDefaultIntervalForRange,
	getIntervalOptionsForDays,
	getPresetByDays
} from '$lib/components/charts/facility/range-interval-config.js';
import { hasSpotPrice } from '../tracker-regions.js';

/** @typedef {import('./types.js').EmissionsMode} EmissionsMode */
/** @typedef {import('./types.js').PriceMode} PriceMode */
/** @typedef {import('./types.js').TrackerRange} TrackerRange */

export const DEFAULT_RANGE_DAYS = 3;

/** The tracker page defaults to the NEM (`_all`), not the combined 'au'
 *  scope — the NEM has a spot price, so the Price card opens meaningfully. */
export const DEFAULT_REGION = '_all';

/** Simplified grouping by default — the approachable first read; Detailed and
 *  the analytical groupings are a pick away in the table panel. */
export const DEFAULT_GROUP = 'simple';

/**
 * @param {unknown} value
 * @returns {PriceMode}
 */
export function normalisePriceMode(value) {
	return value === 'market_value' ? 'market_value' : 'price';
}

/**
 * @param {unknown} value
 * @returns {EmissionsMode}
 */
export function normaliseEmissionsMode(value) {
	return value === 'volume' ? 'volume' : 'intensity';
}

/**
 * The mode the price card actually renders. The 'au' scope has no national
 * spot price, so it always falls back to market value; the user's selection is
 * kept intact for when they return to a single-price scope.
 * @param {string} region
 * @param {PriceMode} priceMode
 * @returns {PriceMode}
 */
export function resolvePriceMode(region, priceMode) {
	return hasSpotPrice(region) ? priceMode : 'market_value';
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
	return typeof value === 'object' && value !== null;
}

/**
 * Coerce any parsed range into a fully-specified one, defaulting the interval
 * from the preset (or the custom span's tier) and falling back to the 3-day
 * default preset.
 * @param {unknown} value
 * @returns {TrackerRange}
 */
export function normaliseRange(value) {
	if (isRecord(value) && value.kind === 'custom') {
		const startMs = Number(value.startMs);
		const endMs = Number(value.endMs);
		if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
			const spanDays = Math.max(1, Math.ceil((endMs - startMs) / (24 * 60 * 60 * 1000)));
			return {
				kind: 'custom',
				startMs,
				endMs,
				intervalId: String(value.intervalId || getIntervalOptionsForDays(spanDays).default)
			};
		}
	}
	if (isRecord(value) && value.kind === 'preset') {
		const preset = getPresetByDays(Number(value.days));
		if (preset) {
			return {
				kind: 'preset',
				days: preset.days,
				intervalId: String(value.intervalId || getDefaultIntervalForRange(preset.id))
			};
		}
	}
	const preset = /** @type {NonNullable<ReturnType<typeof getPresetByDays>>} */ (
		getPresetByDays(DEFAULT_RANGE_DAYS)
	);
	return {
		kind: 'preset',
		days: preset.days,
		intervalId: getDefaultIntervalForRange(preset.id)
	};
}
