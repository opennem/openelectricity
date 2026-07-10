/**
 * Pure Intl date-label primitives for the v2 chart system.
 *
 * This module has no imports from the other formatter modules, so both
 * `formatters.js` and `energy-gridlines.js` can consume it without circular
 * dependencies. All functions take the IANA timezone explicitly so they stay
 * pure and testable.
 */

/** Separator used in all range labels ("21 — 27 Jan"). */
export const RANGE_SEPARATOR = '—';

/**
 * Formatter instances are cached per (format, timezone) — constructing
 * Intl.DateTimeFormat is expensive and these run per axis tick per render.
 * @type {Map<string, Intl.DateTimeFormat>}
 */
const formatterCache = new Map();

/**
 * Get a cached en-AU Intl.DateTimeFormat. `key` must be a stable name that
 * uniquely identifies the option set — callers sharing an option set should
 * share the key.
 *
 * @param {string} key - Stable name for the option set
 * @param {string} ianaTimeZone
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {Intl.DateTimeFormat}
 */
export function cachedFormatter(key, ianaTimeZone, options) {
	const cacheKey = `${key}|${ianaTimeZone}`;
	let fmt = formatterCache.get(cacheKey);
	if (!fmt) {
		fmt = new Intl.DateTimeFormat('en-AU', { ...options, timeZone: ianaTimeZone });
		formatterCache.set(cacheKey, fmt);
	}
	return fmt;
}

/**
 * @param {any} d
 * @returns {Date | null}
 */
function toDate(d) {
	const date = d instanceof Date ? d : typeof d === 'number' ? new Date(d) : null;
	return date && !Number.isNaN(date.getTime()) ? date : null;
}

/**
 * "21 Jan" — day-start axis tick label.
 *
 * @param {Date | number | any} d
 * @param {string} ianaTimeZone
 * @returns {string}
 */
export function formatDayMonth(d, ianaTimeZone) {
	const date = toDate(d);
	if (!date) return String(d);
	return cachedFormatter('dm', ianaTimeZone, { day: 'numeric', month: 'short' }).format(date);
}

/**
 * "21 Jan 2025" — full date, no time.
 *
 * @param {Date | number | any} d
 * @param {string} ianaTimeZone
 * @returns {string}
 */
export function formatDayMonthYear(d, ianaTimeZone) {
	const date = toDate(d);
	if (!date) return '';
	return cachedFormatter('dmy', ianaTimeZone, {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	}).format(date);
}

/**
 * "21 Jan 2025, 2:30 pm" — full date with time of day.
 *
 * @param {Date | number | any} d
 * @param {string} ianaTimeZone
 * @returns {string}
 */
export function formatDayMonthYearTime(d, ianaTimeZone) {
	const date = toDate(d);
	if (!date) return '';
	return cachedFormatter('dmyt', ianaTimeZone, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	}).format(date);
}

/**
 * "Jun 2025".
 *
 * @param {Date | number | any} d
 * @param {string} ianaTimeZone
 * @returns {string}
 */
export function formatMonthYear(d, ianaTimeZone) {
	const date = toDate(d);
	if (!date) return '';
	return cachedFormatter('my', ianaTimeZone, { month: 'short', year: 'numeric' }).format(date);
}

/**
 * "2025".
 *
 * @param {Date | number | any} d
 * @param {string} ianaTimeZone
 * @returns {string}
 */
export function formatYear(d, ianaTimeZone) {
	const date = toDate(d);
	if (!date) return '';
	return cachedFormatter('y', ianaTimeZone, { year: 'numeric' }).format(date);
}

/**
 * Network-local year + 0-based month for a UTC date.
 *
 * @param {Date} date
 * @param {string} ianaTimeZone
 * @returns {{ year: number, month0: number }}
 */
export function localYearMonth(date, ianaTimeZone) {
	const parts = cachedFormatter('ym2', ianaTimeZone, {
		year: 'numeric',
		month: '2-digit'
	}).formatToParts(date);
	const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2000', 10);
	const month0 = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10) - 1;
	return { year, month0 };
}

/**
 * Label for a coarse calendar bucket (quarter / season / half-year / financial
 * year), given a timestamp that falls in the bucket. AU conventions: seasons are
 * meteorological, FY runs July–June and is named by its ending year.
 *
 * @param {Date | number} d
 * @param {string} ianaTimeZone
 * @param {'quarter' | 'season' | 'half' | 'fy'} kind
 * @returns {string}
 */
export function formatBucketLabel(d, ianaTimeZone, kind) {
	const date = toDate(d);
	if (!date) return '';
	const { year, month0 } = localYearMonth(date, ianaTimeZone);

	if (kind === 'quarter') return `Q${Math.floor(month0 / 3) + 1} ${year}`;
	if (kind === 'half') return `${month0 < 6 ? 'H1' : 'H2'} ${year}`;
	if (kind === 'fy') {
		// Bucket starts in July of `year`; FY is named by its ending year.
		const endYear = month0 >= 6 ? year + 1 : year;
		return `FY${endYear}`;
	}
	// season — label by the bucket-start month; summer crosses the year.
	if (month0 === 11) return `Summer ${year}/${String((year + 1) % 100).padStart(2, '0')}`;
	if (month0 <= 1) return `Summer ${year - 1}/${String(year % 100).padStart(2, '0')}`;
	if (month0 <= 4) return `Autumn ${year}`;
	if (month0 <= 7) return `Winter ${year}`;
	return `Spring ${year}`;
}

/**
 * Format a date range label.
 *
 * Same month:      "21 — 27 Jan"
 * Different month:  "28 Jan — 3 Feb"
 * Different year:   "28 Dec '25 — 3 Jan '26"
 *
 * With `alwaysYear`, same-year ranges append the full year once
 * ("16 — 22 Jun 2025", "28 Jul — 3 Aug 2025") — used for tooltip labels
 * that must stand alone, e.g. weekly buckets.
 *
 * With `yearIfNotCurrent`, the year is appended only when the range doesn't
 * end in the current year — used for standalone toolbar labels where a bare
 * "1 — 3 Jul" would read as this year; axis ticks keep the year-less default
 * (their chart supplies the context, and a year on every tick would crowd).
 *
 * @param {Date} start
 * @param {Date} end
 * @param {string} ianaTimeZone
 * @param {{ alwaysYear?: boolean, yearIfNotCurrent?: boolean }} [opts]
 * @returns {string}
 */
export function formatDateRange(
	start,
	end,
	ianaTimeZone,
	{ alwaysYear = false, yearIfNotCurrent = false } = {}
) {
	const partsFmt = cachedFormatter('dmy2', ianaTimeZone, {
		day: 'numeric',
		month: 'short',
		year: '2-digit'
	});

	const sParts = partsFmt.formatToParts(start);
	const eParts = partsFmt.formatToParts(end);

	const sDay = sParts.find((p) => p.type === 'day')?.value;
	const eDay = eParts.find((p) => p.type === 'day')?.value;
	const sMonth = sParts.find((p) => p.type === 'month')?.value;
	const eMonth = eParts.find((p) => p.type === 'month')?.value;
	const sYear = sParts.find((p) => p.type === 'year')?.value;
	const eYear = eParts.find((p) => p.type === 'year')?.value;

	if (sYear !== eYear) {
		return `${sDay} ${sMonth} '${sYear} ${RANGE_SEPARATOR} ${eDay} ${eMonth} '${eYear}`;
	}
	const showYear =
		alwaysYear ||
		(yearIfNotCurrent && formatYear(end, ianaTimeZone) !== formatYear(new Date(), ianaTimeZone));
	const yearSuffix = showYear ? ` ${formatYear(end, ianaTimeZone)}` : '';
	if (sMonth !== eMonth) {
		return `${sDay} ${sMonth} ${RANGE_SEPARATOR} ${eDay} ${eMonth}${yearSuffix}`;
	}
	return `${sDay} ${RANGE_SEPARATOR} ${eDay} ${eMonth}${yearSuffix}`;
}
