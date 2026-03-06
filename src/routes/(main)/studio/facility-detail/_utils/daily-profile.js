/**
 * Daily generation profile — aggregate interval data by hour of day.
 *
 * Takes sub-daily power data (5m or 30m intervals) and produces a
 * 24-bucket profile showing average output by hour, revealing the
 * diurnal generation pattern.
 */

/**
 * Parse a timezone offset string ('+10:00' or '+08:00') to hours.
 * @param {string} tz
 * @returns {number}
 */
function tzOffsetHours(tz) {
	if (!tz) return 10;
	const match = tz.match(/^([+-])(\d{2}):(\d{2})$/);
	if (!match) return 10;
	const sign = match[1] === '+' ? 1 : -1;
	return sign * (parseInt(match[2], 10) + parseInt(match[3], 10) / 60);
}

/**
 * Aggregate interval data into a 24-bucket hourly profile.
 *
 * Each row is bucketed by its local hour (adjusted for the given timezone).
 * All series values are summed per row, then averaged across all rows
 * in the same hour bucket.
 *
 * @param {Array<Record<string, any>>} rows - Must have `time` (ms) + series values
 * @param {string[]} seriesNames - Series to sum (e.g. ['power_UNIT1', 'power_UNIT2'])
 * @param {string} [timezone='+10:00'] - Network timezone offset
 * @returns {Array<{ hour: number, total: number }>} 24 entries (hours 0–23)
 */
export function computeDailyProfile(rows, seriesNames, timezone = '+10:00') {
	/** @type {Array<{ sum: number, count: number }>} */
	const buckets = Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }));

	const offsetMs = tzOffsetHours(timezone) * 3_600_000;

	for (const row of rows) {
		if (row.time == null) continue;

		// Convert UTC ms to local hour
		const localMs = row.time + offsetMs;
		const hour = Math.floor((localMs % 86_400_000) / 3_600_000);
		if (hour < 0 || hour > 23) continue;

		// Sum all series for this row
		let rowTotal = 0;
		let hasValue = false;
		for (const name of seriesNames) {
			const val = row[name];
			if (typeof val === 'number' && !isNaN(val)) {
				rowTotal += val;
				hasValue = true;
			}
		}

		if (hasValue) {
			buckets[hour].sum += rowTotal;
			buckets[hour].count++;
		}
	}

	return buckets.map((b, hour) => ({
		hour,
		total: b.count > 0 ? b.sum / b.count : 0
	}));
}

/**
 * Check if interval data is sub-daily (power mode) — suitable for daily profiles.
 * Returns false for daily/monthly energy data.
 *
 * @param {Array<Record<string, any>>} rows - Must have `time` field
 * @returns {boolean}
 */
export function isSubDailyData(rows) {
	if (rows.length < 2) return false;
	const gap = rows[1].time - rows[0].time;
	// Sub-daily = interval < 2 hours (5m = 300_000, 30m = 1_800_000, 1h = 3_600_000)
	return gap > 0 && gap < 7_200_000;
}
