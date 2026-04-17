import { stripDateTimezone } from '$lib/utils/date-format';
import { formatDateTime } from '$lib/utils/formatters';

/**
 * Calculate commissioning percentage
 * @param {number} maxGen
 * @param {number} cap
 * @returns {string}
 */
export function getPercentage(maxGen, cap) {
	if (!cap || cap === 0) return '0';
	return ((maxGen / cap) * 100).toFixed(0);
}

/**
 * Parse a date string with timezone stripping and network offset
 * @param {string} dateValue
 * @param {string} offset - e.g. '+10:00' or '+08:00'
 * @returns {Date}
 */
export function getParsedDate(dateValue, offset) {
	if (!dateValue) return new Date();
	return new Date(stripDateTimezone(dateValue) + offset);
}

/**
 * Format a date as "3:30pm on 14 Mar 2025"
 * @param {Date} date
 * @returns {string}
 */
export function formatTimestampLabel(date) {
	const time = formatDateTime({ date, hour: 'numeric', minute: '2-digit', hour12: true })
		.split(' ')
		.join('');
	const day = formatDateTime({ date, month: 'short', day: 'numeric', year: 'numeric' });
	return `${time} on ${day}`;
}
