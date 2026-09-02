import { baseIntervalFor } from '$lib/components/charts/facility/range-interval-config.js';
import { getIntervalHours } from '$lib/components/charts/facility/interval-hours.js';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Find the displayed bucket that contains `nowMs`. A row is only marked when
 * its interval is still open; stale data from the last completed bucket stays
 * solid. Rolling values use their sampling grain (month/season/quarter/half)
 * rather than treating the full trailing twelve months as one bucket.
 *
 * @param {any[]} rows - Time-sorted displayed rows
 * @param {string} displayInterval
 * @param {number} nowMs
 * @param {string} ianaTimeZone
 * @returns {{ start: number, end: number } | null}
 */
export function currentIncompleteInterval(rows, displayInterval, nowMs, ianaTimeZone) {
	if (!Array.isArray(rows) || rows.length === 0 || !Number.isFinite(nowMs)) return null;

	let start = null;
	for (const row of rows) {
		const time = Number(row?.time);
		if (!Number.isFinite(time) || time > nowMs) continue;
		if (start === null || time > start) start = time;
	}
	if (start === null) return null;

	const bucketInterval = baseIntervalFor(displayInterval) ?? displayInterval;
	const spanMs = getIntervalHours(bucketInterval, start, ianaTimeZone) * HOUR_MS;
	const end = start + spanMs;
	return nowMs < end ? { start, end } : null;
}
