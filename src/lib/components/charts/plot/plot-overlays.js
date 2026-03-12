/**
 * Overlay utilities for Observable Plot charts.
 *
 * Provides coordinate conversion and night-period computation
 * for rendering overlays aligned with Plot's chart area.
 */

/**
 * Convert a time in ms to a pixel X position within the Plot chart area.
 * @param {number} timeMs
 * @param {number} viewStart - viewport start ms
 * @param {number} viewEnd - viewport end ms
 * @param {number} marginLeft
 * @param {number} containerWidth
 * @param {number} marginRight
 * @returns {number}
 */
export function timeToPx(timeMs, viewStart, viewEnd, marginLeft, containerWidth, marginRight) {
	const plotWidth = containerWidth - marginLeft - marginRight;
	return marginLeft + ((timeMs - viewStart) / (viewEnd - viewStart)) * plotWidth;
}

/**
 * Parse a timezone offset string like '+10:00' or '+08:00' into milliseconds.
 * @param {string} offset - e.g. '+10:00'
 * @returns {number} offset in ms
 */
function parseOffsetMs(offset) {
	const sign = offset.startsWith('-') ? -1 : 1;
	const [h, m] = offset.replace(/^[+-]/, '').split(':').map(Number);
	return sign * (h * 3600000 + (m || 0) * 60000);
}

/**
 * Convert a local time (year, month, day, hour) to UTC ms using an offset.
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} day
 * @param {number} hour
 * @param {string} offset - e.g. '+10:00'
 * @returns {number} UTC ms
 */
function localToUtcMs(year, month, day, hour, offset) {
	const utcMs = Date.UTC(year, month, day, hour, 0, 0, 0);
	return utcMs - parseOffsetMs(offset);
}

/** @type {number} 7 days in ms — night shading visibility threshold */
const NIGHT_SHADING_MAX_VIEWPORT = 7 * 86_400_000;

/**
 * Check if the viewport is narrow enough to show night shading.
 * @param {number} viewStart
 * @param {number} viewEnd
 * @returns {boolean}
 */
export function shouldShowNightShading(viewStart, viewEnd) {
	return viewEnd - viewStart < NIGHT_SHADING_MAX_VIEWPORT;
}

/**
 * Compute night period [start, end] Date pairs for the given viewport.
 * Night = 22:00 to 06:00 (next day) in the facility's local timezone.
 *
 * @param {number} viewStart - viewport start ms
 * @param {number} viewEnd - viewport end ms
 * @param {string} offset - timezone offset, e.g. '+10:00'
 * @returns {Array<[Date, Date]>}
 */
export function computeNightPeriods(viewStart, viewEnd, offset) {
	const offsetMs = parseOffsetMs(offset);
	const periods = /** @type {Array<[Date, Date]>} */ ([]);

	// Extend range by 1 day each side to catch partial nights
	const rangeStart = viewStart - 86_400_000;
	const rangeEnd = viewEnd + 86_400_000;

	// Find the start day in local time
	const startLocal = new Date(rangeStart + offsetMs);
	let year = startLocal.getUTCFullYear();
	let month = startLocal.getUTCMonth();
	let day = startLocal.getUTCDate();

	// Iterate day by day
	while (true) {
		// Night start: 22:00 local on this day
		const nightStartMs = localToUtcMs(year, month, day, 22, offset);
		// Night end: 06:00 local on the next day
		const nextDay = new Date(Date.UTC(year, month, day + 1));
		const nightEndMs = localToUtcMs(
			nextDay.getUTCFullYear(),
			nextDay.getUTCMonth(),
			nextDay.getUTCDate(),
			6,
			offset
		);

		if (nightStartMs > rangeEnd) break;

		// Only include if it overlaps the viewport
		if (nightEndMs > viewStart && nightStartMs < viewEnd) {
			periods.push([new Date(nightStartMs), new Date(nightEndMs)]);
		}

		// Advance to next day
		const next = new Date(Date.UTC(year, month, day + 1));
		year = next.getUTCFullYear();
		month = next.getUTCMonth();
		day = next.getUTCDate();
	}

	return periods;
}
