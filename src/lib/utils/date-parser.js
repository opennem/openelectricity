import { formatInTimeZone } from 'date-fns-tz';

/**
 * @param {Date} date
 * @param {string} timeZone
 * @param {boolean} withTime
 * @returns {string}
 */
function plainDateTime(date, timeZone, withTime) {
	let dateStr = formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
	let timeStr = formatInTimeZone(date, timeZone, 'HH:mm');

	return withTime ? `${dateStr}T${timeStr}` : dateStr;
}

export { plainDateTime };
