import { parseDate, DateFormatter } from '@internationalized/date';

/** @typedef {import('@internationalized/date').CalendarDate} CalendarDate */

/**
 * Strip inconsistent timezone info from API date strings.
 * The API returns dates with either Z or +HH:MM — this normalises
 * them to a bare datetime string so callers can re-apply the correct offset.
 * @param {string} dateValue
 * @returns {string}
 */
export function stripDateTimezone(dateValue) {
	return dateValue.includes('Z') ? dateValue.split('Z')[0] : dateValue.split('+')[0];
}

/**
 * A time zone every browser's `Intl` accepts. Older browsers reject UTC
 * offsets such as the networks' '+10:00' ("invalid time zone"), so a
 * whole-hour offset becomes the fixed-offset IANA zone that formats the same,
 * 'Etc/GMT-10' (POSIX inverts the sign). Not the network's city: Perth kept
 * daylight saving in 2006–09 while the WEM stayed on +08:00. IANA names pass
 * through.
 * @template {string | undefined} T
 * @param {T} timeZone
 * @returns {T | string}
 */
export function intlTimeZone(timeZone) {
	const match = /^([+-])(\d{2}):00$/.exec(timeZone ?? '');
	if (!match) return timeZone;
	const hours = Number(match[2]);
	if (hours === 0) return 'UTC';
	return `Etc/GMT${match[1] === '+' ? '-' : '+'}${hours}`;
}

/**
 * The calendar date a facility or unit date names. These dates arrive as plain
 * dates from Sanity (`2022-01-01`), naive local datetimes from the data-centre
 * sheet (`2022-01-01T00:00:00`) and local midnight with the network offset from
 * the OE API (`2022-01-01T00:00:00+10:00`). In every shape the leading
 * YYYY-MM-DD is the local date, so read it directly: converting through an
 * instant shifts the day by the runtime's timezone (1 Jan becomes 31 Dec when
 * rendered in UTC or west of the network).
 * @param {string | null | undefined} dateValue
 * @returns {CalendarDate | null} null when missing or not a valid date
 */
export function parseCalendarDate(dateValue) {
	const match = typeof dateValue === 'string' ? /^\d{4}-\d{2}-\d{2}/.exec(dateValue) : null;
	if (!match) return null;
	try {
		return parseDate(match[0]);
	} catch {
		return null;
	}
}

/** @type {Record<string, Intl.DateTimeFormatOptions>} */
const SPECIFICITY_FORMATS = {
	day: { year: 'numeric', month: 'short', day: 'numeric' },
	month: { year: 'numeric', month: 'short' },
	quarter: { year: 'numeric' },
	year: { year: 'numeric' }
};

/**
 * Format a facility or unit date to its specificity (day when unknown), e.g.
 * "1 Jan 2022", "Jan 2022" or "2022". Reads the calendar date (see
 * parseCalendarDate), so the label never depends on the runtime's timezone.
 * @param {string | null | undefined} dateValue
 * @param {string | null | undefined} specificity - 'day', 'month', 'quarter' or 'year'
 * @returns {string} '-' when missing or unparseable
 */
export function formatDateBySpecificity(dateValue, specificity) {
	const date = parseCalendarDate(dateValue);
	if (!date) return '-';

	const options = SPECIFICITY_FORMATS[specificity?.toLowerCase() ?? ''] ?? SPECIFICITY_FORMATS.day;
	return new DateFormatter('en-AU', { ...options, timeZone: 'UTC' }).format(date.toDate('UTC'));
}
