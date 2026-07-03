/**
 * The single source of truth for how chart dates render per display interval.
 *
 * Given a display interval and the network's IANA timezone, the policy yields:
 * - `formatTooltip` — the full, standalone label for one data point (tooltip
 *   headers, bar band keys). Always renders something readable.
 * - `bucketTick` — an explicit per-bucket axis labeller for coarse calendar
 *   buckets that don't align to the Jan/month gridlines the axis inference
 *   assumes, or `null` to let gridline inference own tick placement.
 */

import {
	formatBucketLabel,
	formatDateRange,
	formatDayMonthYear,
	formatDayMonthYearTime,
	formatMonthYear,
	formatYear
} from './date-labels.js';

/**
 * Calendar buckets labelled by name or year rather than a date. Each gets an
 * explicit per-bucket axis labeller (`bucketTick`) because their starts don't
 * align to the Jan/month gridlines the axis inference assumes — without one,
 * short viewports can render a year bucket as "Jan '25".
 */
export const COARSE_BUCKET_INTERVALS = new Set(['quarter', 'season', 'half', 'fy', '1y']);

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {Object} TimeFormatPolicy
 * @property {(d: Date | number) => string} formatTooltip - Standalone label for one point
 * @property {((d: Date | number) => string) | null} bucketTick - Per-bucket axis label,
 *           or null to defer to gridline inference
 */

/**
 * @param {string} displayInterval - '5m' | '30m' | '1h' | '1d' | '7d' | '1M' | '3M' |
 *        'quarter' | 'season' | 'half' | 'fy' | '1y'
 * @param {string} ianaTimeZone - e.g. 'Australia/Brisbane'
 * @returns {TimeFormatPolicy}
 */
export function getTimeFormatPolicy(displayInterval, ianaTimeZone) {
	if (COARSE_BUCKET_INTERVALS.has(displayInterval)) {
		// Yearly buckets are labelled by their bare year; the rest by name.
		const label =
			displayInterval === '1y'
				? (/** @type {Date | number} */ d) => formatYear(d, ianaTimeZone)
				: (/** @type {Date | number} */ d) =>
						formatBucketLabel(
							d,
							ianaTimeZone,
							/** @type {'quarter' | 'season' | 'half' | 'fy'} */ (displayInterval)
						);
		return { formatTooltip: label, bucketTick: label };
	}

	if (displayInterval === '7d') {
		// A week bucket reads as its inclusive range, with the year so the
		// label stands alone: "16 — 22 June 2025". Exact arithmetic — the
		// network zones don't observe DST.
		return {
			formatTooltip: (d) => {
				const start = d instanceof Date ? d : new Date(d);
				if (Number.isNaN(start.getTime())) return '';
				const end = new Date(start.getTime() + 6 * DAY_MS);
				return formatDateRange(start, end, ianaTimeZone, { alwaysYear: true });
			},
			bucketTick: null
		};
	}

	if (displayInterval === '1M' || displayInterval === '3M') {
		return { formatTooltip: (d) => formatMonthYear(d, ianaTimeZone), bucketTick: null };
	}

	if (displayInterval === '5m' || displayInterval === '30m' || displayInterval === '1h') {
		return { formatTooltip: (d) => formatDayMonthYearTime(d, ianaTimeZone), bucketTick: null };
	}

	// Daily (1d) and anything unknown: full date, no time.
	return { formatTooltip: (d) => formatDayMonthYear(d, ianaTimeZone), bucketTick: null };
}
