/**
 * Timezone helpers for the two Australian electricity networks:
 * NEM = AEST +10:00 ('Australia/Brisbane'), WEM = AWST +08:00 ('Australia/Perth').
 *
 * Neither zone observes DST, so a fixed offset and its IANA name are exactly
 * interchangeable — these helpers are the single place that mapping lives.
 */

const HOUR_MS = 60 * 60 * 1000;

/**
 * IANA timezone name for a network offset string.
 *
 * @param {string | undefined | null} offset - e.g. '+08:00'
 * @returns {string}
 */
export function ianaFromOffset(offset) {
	return offset === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane';
}

/**
 * Whole-hour UTC offset for an IANA network timezone name.
 *
 * @param {string | undefined | null} ianaTimeZone - e.g. 'Australia/Perth'
 * @returns {number}
 */
export function offsetHoursFromIana(ianaTimeZone) {
	return ianaTimeZone === 'Australia/Perth' ? 8 : 10;
}

/**
 * Whole-hour UTC offset for a network offset string.
 *
 * @param {string | undefined | null} offset - e.g. '+08:00'
 * @returns {number}
 */
export function offsetHoursFromOffset(offset) {
	return offset === '+08:00' ? 8 : 10;
}

/**
 * UTC offset in milliseconds for a network offset string.
 *
 * @param {string | undefined | null} offset - e.g. '+08:00'
 * @returns {number}
 */
export function offsetMsFromOffset(offset) {
	return offsetHoursFromOffset(offset) * HOUR_MS;
}

/**
 * YYYY-MM-DD for the given instant in the network's local day.
 *
 * @param {number} ms - epoch ms
 * @param {string | undefined | null} offset - network offset, e.g. '+10:00'
 * @returns {string}
 */
export function toNetworkDateString(ms, offset) {
	return new Date(ms + offsetMsFromOffset(offset)).toISOString().slice(0, 10);
}
