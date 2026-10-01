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

/** One profile as chart rows: its `average`, plus every day's value keyed by date.
 * @param {ReturnType<typeof import('./time-of-day.js').buildDailyProfile>} profile
 * @param {string[]} dates */
export function dailyProfileRows(profile, dates) {
	return profile.map((row) =>
		chartRow(row.minute, {
			...Object.fromEntries(dates.map((date, i) => [date, row.values[i]])),
			average: row.average
		})
	);
}

/** One profile's averages as chart rows keyed by `key`.
 * @param {ReturnType<typeof import('./time-of-day.js').buildDailyProfile>} profile
 * @param {string} key */
export function profileRows(profile, key) {
	return profile.map((row) => chartRow(row.minute, { [key]: row.average }));
}

/** @typedef {ReturnType<typeof import('./time-of-day.js').buildAverageDayStack>} ProfileLayers */

/** One chart row per half-hour slot, valued per technology by `value`.
 * @param {ProfileLayers} layers
 * @param {(point: ProfileLayers[number]['points'][number]) => number | null} value */
function layerRows(layers, value) {
	return (layers[0]?.points ?? []).map((point, i) =>
		chartRow(
			point.minute,
			Object.fromEntries(layers.map((layer) => [layer.name, value(layer.points[i])]))
		)
	);
}

/** The drawn stack: a slot any technology is missing from is a gap for all.
 * @param {ProfileLayers} layers */
export function stackedProfileRows(layers) {
	return layerRows(layers, (point) => (point.y0 === null ? null : point.value));
}

/** Each technology's own average, whether or not the stack can be drawn.
 * @param {ProfileLayers} layers */
export function averageProfileRows(layers) {
	return layerRows(layers, (point) => point.value);
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
