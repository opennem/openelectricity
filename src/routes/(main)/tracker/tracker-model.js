/**
 * Pure state helpers for the tracker page — defaults, mode normalisation,
 * range-snapshot maths and the region-dependent price-mode resolution. Kept
 * out of the components so the rules are unit-testable.
 */

import {
	getDefaultIntervalForRange,
	getIntervalOptionsForDays,
	getPresetByDays
} from '$lib/components/charts/facility/range-interval-config.js';
import { MIN_DATE } from '$lib/utils/date-range.js';
import { hasSpotPrice } from './tracker-regions.js';

/** @typedef {import('./types.js').EmissionsMode} EmissionsMode */
/** @typedef {import('./types.js').PriceMode} PriceMode */
/** @typedef {import('./types.js').TrackerRange} TrackerRange */

const DAY_MS = 86_400_000;

export const DEFAULT_RANGE_DAYS = 3;

/** The tracker page defaults to the NEM (`_all`), not the combined 'au'
 *  scope — the NEM has a spot price, so the Price card opens meaningfully. */
export const DEFAULT_REGION = '_all';

/** Simplified grouping by default — the approachable first read; Detailed and
 *  the analytical groupings are a pick away in the nav bar's options menu. */
export const DEFAULT_GROUP = 'simple';

/** A custom span longer than this counts as the All tier — the same threshold
 *  `ChartRangeBar` uses to offer the calendar-period filter. */
const ALL_TIER_MIN_DAYS = 550;

/**
 * Whole days spanned by a window, never less than one — the day count the
 * range presets and interval tiers are keyed on.
 * @param {number} startMs
 * @param {number} endMs
 */
export function rangeSpanDays(startMs, endMs) {
	return Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
}

/**
 * Whether a range sits in the All tier, where calendar-period filters apply.
 * @param {TrackerRange} range
 */
export function isAllTierRange(range) {
	return range.kind === 'preset'
		? range.days === -1
		: rangeSpanDays(range.startMs, range.endMs) > ALL_TIER_MIN_DAYS;
}

/**
 * Viewport bounds a range snapshot resolves to when anchored at `nowMs` —
 * the same maths `createChartRangeControl` applies to a preset pick, so the
 * server-rendered range bar matches what the charts open on.
 * @param {TrackerRange} range
 * @param {number} nowMs
 * @returns {{ startMs: number, endMs: number }}
 */
export function rangeSnapshotBounds(range, nowMs) {
	if (range.kind === 'custom') return { startMs: range.startMs, endMs: range.endMs };
	const days = range.days === -1 ? rangeSpanDays(new Date(MIN_DATE).getTime(), nowMs) : range.days;
	return { startMs: nowMs - days * DAY_MS, endMs: nowMs };
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
			return {
				kind: 'custom',
				startMs,
				endMs,
				intervalId: String(
					value.intervalId || getIntervalOptionsForDays(rangeSpanDays(startMs, endMs)).default
				)
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
