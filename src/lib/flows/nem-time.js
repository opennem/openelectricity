/**
 * NEM local-time helpers for OE API date params.
 *
 * The OE API expects timezone-naive timestamps in the network's local time —
 * for the NEM that's UTC+10 with no DST. Shifting UTC ms by the offset and
 * dropping the `Z` yields the naive NEM-local string the API wants.
 */

export const HOURS_MS = 3600_000;

/** NEM local-time offset (UTC+10, no DST) in milliseconds. */
export const NEM_OFFSET_MS = 10 * HOURS_MS;

/**
 * Timezone-naive NEM-local date range spanning the last `msBack` milliseconds,
 * ending now — formatted as `YYYY-MM-DDTHH:mm:ss` for the OE API's
 * `dateStart`/`dateEnd` params.
 * @param {number} msBack - Window length in milliseconds
 * @returns {{ dateStart: string, dateEnd: string }}
 */
export function nemNaiveRange(msBack) {
	const nowMs = Date.now();
	return {
		dateStart: new Date(nowMs + NEM_OFFSET_MS - msBack).toISOString().slice(0, 19),
		dateEnd: new Date(nowMs + NEM_OFFSET_MS).toISOString().slice(0, 19)
	};
}
