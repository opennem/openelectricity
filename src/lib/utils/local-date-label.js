const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Format an API timestamp by its own calendar date (the leading YYYY-MM-DD),
 * never the viewer's or server's timezone. The API emits unit dates as local
 * midnight with the network offset, so the date part is already the local date.
 * @param {string | null | undefined} value
 * @returns {string | null} e.g. "1 Jan 1979"; raw string when unparseable; null when empty
 */
export function formatLocalDateLabel(value) {
	if (!value) return null;
	const m = LOCAL_DATE_RE.exec(value);
	if (!m) return value;
	const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('en-AU', {
		timeZone: 'UTC',
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
}

/**
 * Latest of several timestamps by instant (offsets may differ), not string order.
 * Unparseable values only win when nothing parses.
 * @param {Array<string | null | undefined>} values
 * @returns {string | null}
 */
export function latestTimestamp(values) {
	let latest = /** @type {string | null} */ (null);
	let latestMs = Number.NEGATIVE_INFINITY;
	let fallback = /** @type {string | null} */ (null);
	for (const v of values) {
		if (!v) continue;
		const ms = Date.parse(v);
		if (Number.isNaN(ms)) {
			fallback = v;
		} else if (ms > latestMs) {
			latestMs = ms;
			latest = v;
		}
	}
	return latest ?? fallback;
}
