/**
 * @typedef {'date' | 'time' | 'date-time'} TooltipDateFormat
 */

import { appendHistoricalYear } from '$lib/components/charts/v2/date-labels.js';

const DATE_OPTIONS = /** @type {const} */ ({
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

const TIME_OPTIONS = /** @type {const} */ ({
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

const DAY_MS = 86_400_000;

/**
 * Convert an ISO-like source value to a UTC Date containing its written
 * wall-clock components. This preserves `18:00` from a value such as
 * `2026-07-01T18:00:00+10:00` instead of converting it to another zone.
 *
 * @param {string | null | undefined} source
 * @returns {Date | null}
 */
function sourceWallClockDate(source) {
	if (!source) return null;
	const match = source
		.trim()
		.replace(/^["']|["']$/g, '')
		.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
	if (!match) return null;
	const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
	return new Date(
		Date.UTC(
			Number(year),
			Number(month) - 1,
			Number(day),
			Number(hour),
			Number(minute),
			Number(second)
		)
	);
}

/**
 * Return the wall-clock offset encoded by a raw CSV timestamp relative to its
 * parsed instant. The offset lets axis ticks preserve the source timezone
 * without depending on the viewer's browser locale or timezone.
 *
 * @param {Record<string, any>} row
 * @returns {{ instant: number, offset: number } | null}
 */
function sourceWallClockOffset(row) {
	const instant = row.date instanceof Date ? row.date.getTime() : NaN;
	const wallClock = sourceWallClockDate(row._dateStr);
	if (!Number.isFinite(instant) || !wallClock) return null;
	return { instant, offset: wallClock.getTime() - instant };
}

/**
 * Build an explicit en-AU formatter for a temporal chart axis. Short spans use
 * 24-hour time; progressively wider spans use Australian date ordering with
 * enough context to keep labels unambiguous.
 *
 * @param {Array<Record<string, any>>} data
 * @param {Date | number} [referenceDate] - Current-year reference (test override)
 * @returns {(value: Date | number | string) => string}
 */
export function createAustralianDateAxisFormatter(data, referenceDate = new Date()) {
	const dates = data
		.map((row) => (row.date instanceof Date ? row.date.getTime() : NaN))
		.filter(Number.isFinite);
	const min = dates.length > 0 ? Math.min(...dates) : 0;
	const max = dates.length > 0 ? Math.max(...dates) : min;
	const span = max - min;
	const offsets = data.map(sourceWallClockOffset).filter((entry) => entry !== null);

	/** @type {Intl.DateTimeFormatOptions} */
	let options;
	if (span <= 1.5 * DAY_MS) {
		options = { ...TIME_OPTIONS };
	} else if (span <= 14 * DAY_MS) {
		options = { day: 'numeric', month: 'short', ...TIME_OPTIONS };
	} else if (span <= 120 * DAY_MS) {
		options = { day: 'numeric', month: 'short' };
	} else if (span <= 3 * 365 * DAY_MS) {
		options = { month: 'short', year: 'numeric' };
	} else {
		options = { year: 'numeric' };
	}
	const alreadyIncludesYear = options.year !== undefined;
	const formatter = new Intl.DateTimeFormat('en-AU', { ...options, timeZone: 'UTC' });

	return (value) => {
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.getTime())) return String(value);
		let offset = 0;
		let distance = Infinity;
		for (const entry of offsets) {
			const nextDistance = Math.abs(entry.instant - date.getTime());
			if (nextDistance < distance) {
				distance = nextDistance;
				offset = entry.offset;
			}
		}
		const wallClockDate = new Date(date.getTime() + offset);
		const label = formatter.format(wallClockDate);
		return alreadyIncludesYear
			? label
			: appendHistoricalYear(wallClockDate, label, 'UTC', referenceDate);
	};
}

/**
 * Select evenly spaced source timestamps for a temporal axis. Using actual CSV
 * timestamps keeps ticks aligned to the source wall clock instead of UTC
 * boundaries chosen by the plotting library.
 *
 * @param {Array<Record<string, any>>} data
 * @param {number} [targetCount]
 * @returns {Date[]}
 */
export function createAustralianDateAxisTicks(data, targetCount = 8) {
	const byTime = new Map();
	for (const row of data) {
		if (row.date instanceof Date && !Number.isNaN(row.date.getTime())) {
			byTime.set(row.date.getTime(), row.date);
		}
	}
	const dates = [...byTime.values()].sort((a, b) => a.getTime() - b.getTime());
	if (dates.length <= targetCount) return dates;
	const step = Math.max(1, Math.ceil(dates.length / Math.max(1, targetCount)));
	return dates.filter((_, index) => index % step === 0);
}

/**
 * Format a time-series tooltip value. ISO-like input preserves the wall-clock
 * components written in the CSV; other supported date formats fall back to
 * the parser's Date value in UTC for deterministic embeds.
 *
 * @param {Date | number | string} value
 * @param {TooltipDateFormat} [format]
 * @param {string | null} [source]
 * @returns {string}
 */
export function formatTooltipDate(value, format = 'date', source = null) {
	const parsed = value instanceof Date ? value : new Date(value);
	const date = sourceWallClockDate(source) ?? parsed;
	if (Number.isNaN(date.getTime())) return String(source ?? value);

	if (format === 'time') {
		return new Intl.DateTimeFormat('en-AU', { ...TIME_OPTIONS, timeZone: 'UTC' }).format(date);
	}
	if (format === 'date-time') {
		return new Intl.DateTimeFormat('en-AU', {
			...DATE_OPTIONS,
			...TIME_OPTIONS,
			timeZone: 'UTC'
		}).format(date);
	}
	return new Intl.DateTimeFormat('en-AU', { ...DATE_OPTIONS, timeZone: 'UTC' }).format(date);
}
