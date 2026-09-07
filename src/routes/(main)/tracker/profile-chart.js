// A synthetic UTC day lets Stratum reuse its time interactions without exposing
// a fabricated calendar date. All visible labels remain network-local clock time.
export const PROFILE_DAY_START = Date.UTC(2000, 0, 1);
export const PROFILE_SLOT_MS = 30 * 60_000;
export const PROFILE_DAY_END = PROFILE_DAY_START + 86_400_000;

/** @param {number | Date} value */
export function profileClock(value) {
	const minute = Math.max(
		0,
		Math.min(1440, Math.floor((Number(value) - PROFILE_DAY_START) / 60_000))
	);
	return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/** @param {number} minute @param {Record<string, number | null>} values
 * @returns {Record<string, any> & {time: number, date: Date}} */
function chartRow(minute, values) {
	const time = PROFILE_DAY_START + minute * 60_000;
	return { ...values, time, date: new Date(time) };
}

/** @param {ReturnType<typeof import('./time-of-day.js').buildDailyProfile>} profile
 * @param {string[]} dates @param {boolean} daily */
export function individualProfileRows(profile, dates, daily) {
	return profile.map((row) =>
		chartRow(row.minute, {
			...(daily ? Object.fromEntries(dates.map((date, i) => [date, row.values[i]])) : {}),
			average: row.average
		})
	);
}

/** @param {ReturnType<typeof import('./time-of-day.js').buildAverageDayStack>} layers */
export function stackedProfileRows(layers) {
	return (layers[0]?.points ?? []).map((point, i) =>
		chartRow(
			point.minute,
			Object.fromEntries(
				layers.map((layer) => [
					layer.name,
					layer.points[i].y0 === null ? null : layer.points[i].value
				])
			)
		)
	);
}

/** @param {number} start @param {number} end */
export function clampProfileViewport(start, end) {
	const duration = Math.min(86_400_000, Math.max(3_600_000, end - start));
	const left = Math.max(PROFILE_DAY_START, Math.min(start, PROFILE_DAY_END - duration));
	return { start: left, end: left + duration };
}

/** Clock-aligned ticks, independent of the browser's civil timezone.
 * @param {number} start @param {number} end */
export function profileTicks(start, end) {
	const duration = end - start;
	const step =
		duration <= 4 * 3_600_000
			? PROFILE_SLOT_MS
			: duration <= 12 * 3_600_000
				? 2 * 3_600_000
				: 4 * 3_600_000;
	const first = PROFILE_DAY_START + Math.ceil((start - PROFILE_DAY_START) / step) * step;
	return Array.from(
		{ length: Math.max(0, Math.floor((end - first) / step) + 1) },
		(_, i) => new Date(first + i * step)
	);
}
