/**
 * OE API per-interval range caps (days). Wider chart windows are split into
 * bounded requests by ChartDataManager. Daily and coarser grains have no cap
 * represented here.
 * @type {Readonly<Record<string, number>>}
 */
export const OE_API_MAX_RANGE_DAYS = Object.freeze({ '5m': 30, '1h': 365 });

const DAY_MS = 86_400_000;

/**
 * Return a user-facing error when a direct API request exceeds an OE interval
 * cap. ChartDataManager avoids this by splitting wider views into batches.
 *
 * @param {string} interval
 * @param {string | undefined} dateStart
 * @param {string | undefined} dateEnd
 * @returns {string | null}
 */
export function apiRangeLimitError(interval, dateStart, dateEnd) {
	const limitDays = OE_API_MAX_RANGE_DAYS[interval];
	if (!limitDays || !dateStart || !dateEnd) return null;
	const start = new Date(`${dateStart}Z`).getTime();
	const end = new Date(`${dateEnd}Z`).getTime();
	if (!Number.isFinite(start) || !Number.isFinite(end) || end - start <= limitDays * DAY_MS) {
		return null;
	}
	return `${interval} requests can cover at most ${limitDays} days.`;
}
