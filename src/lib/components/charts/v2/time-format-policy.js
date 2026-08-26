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
	RANGE_SEPARATOR,
	formatBucketLabel,
	formatDateRange,
	formatDayMonthYear,
	formatDayMonthYearTime,
	formatMonthYear,
	formatYear
} from './date-labels.js';
import { tzAbbreviationFromIana } from './network-time.js';

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

/**
 * Interval-aware label for a `[start, end]` viewport — the standalone
 * toolbar/nav range readout. Endpoints render at the display grain's
 * resolution:
 *
 * - Coarse calendar buckets by name, collapsing when both ends fall in the
 *   same bucket: "FY2024 — FY2026", "Q1 2025 — Q3 2026", "Winter 2025", "2024".
 * - Months: "Aug 2025 — Aug 2026", collapsing likewise.
 * - Sub-daily with clock times and the (DST-free) zone the times are in:
 *   "19 Aug 2026, 10:00 am — 26 Aug 2026, 10:00 am AEST".
 * - Daily/weekly: a plain date range, with the year when it isn't the
 *   current one ("19 — 26 Aug 2025") since the label stands alone.
 *
 * @param {Date | number} start
 * @param {Date | number} end
 * @param {string} displayInterval
 * @param {string} ianaTimeZone
 * @returns {string}
 */
export function formatRangeLabel(start, end, displayInterval, ianaTimeZone) {
	if (
		COARSE_BUCKET_INTERVALS.has(displayInterval) ||
		displayInterval === '1M' ||
		displayInterval === '3M'
	) {
		const label = getTimeFormatPolicy(displayInterval, ianaTimeZone).formatTooltip;
		const startLabel = label(start);
		const endLabel = label(end);
		return startLabel === endLabel ? startLabel : `${startLabel} ${RANGE_SEPARATOR} ${endLabel}`;
	}

	if (displayInterval === '5m' || displayInterval === '30m' || displayInterval === '1h') {
		const startLabel = formatDayMonthYearTime(start, ianaTimeZone);
		const endLabel = formatDayMonthYearTime(end, ianaTimeZone);
		return `${startLabel} ${RANGE_SEPARATOR} ${endLabel} ${tzAbbreviationFromIana(ianaTimeZone)}`;
	}

	// Daily/weekly grains — the viewport resolves to dates, not times. (The 7d
	// tooltip's week-bucket range doesn't apply: this labels the viewport's own
	// endpoints, not one bucket.)
	return formatDateRange(
		start instanceof Date ? start : new Date(start),
		end instanceof Date ? end : new Date(end),
		ianaTimeZone,
		{ yearIfNotCurrent: true }
	);
}
