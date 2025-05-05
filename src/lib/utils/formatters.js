import { format } from 'date-fns';

/** @typedef {"long" | "short" | "numeric" | "2-digit" | "narrow" | undefined}  DateTimeFormatMonthStyles */
/** @typedef {"full" | "long" | "medium" | "short" | undefined} DateTimeFormatDateTimeStyles */

export const getNumberFormat = (maximumFractionDigits = 0, useGrouping = true) =>
	new Intl.NumberFormat('en-AU', {
		maximumFractionDigits,
		useGrouping
	});

export const formatFyTickX = (/** @type {Date | number} */ d) => {
	return format(d, 'yyyy');
};

export const formatValue = (/** @type {number | null | undefined} */ d) => {
	if (d === null || isNaN(d)) return '—';

	const maximumFractionDigits = Math.abs(d) < 11 ? 2 : 0;
	const formatted = getNumberFormat(maximumFractionDigits).format(d);
	if (formatted !== '0') {
		return formatted;
	}
	return formatted;
};

/**
 *
 * @param {Date} date
 * @param {DateTimeFormatDateTimeStyles} dateStyle
 * @param {DateTimeFormatDateTimeStyles} timeStyle
 * @param {string} timeZone
 * @returns
 */
export function getFormattedDateTime(
	date,
	dateStyle = 'full',
	timeStyle = 'long',
	timeZone = 'Australia/Sydney'
) {
	return new Intl.DateTimeFormat('en-AU', {
		dateStyle,
		timeStyle,
		timeZone
	}).format(date);
}

/**
 *
 * @param {Date} date
 * @param {string} timeZone
 * @returns
 */
export function getFormattedTime(date, timeZone = 'Australia/Sydney') {
	return new Intl.DateTimeFormat('en-AU', {
		timeStyle: 'short',
		timeZone
	}).format(date);
}

/**
 *
 * @param {Date} date
 * @param {DateTimeFormatMonthStyles} [month]
 * @param {string} timeZone
 * @returns
 */
export function getFormattedMonth(date, month, timeZone = 'Australia/Sydney') {
	return new Intl.DateTimeFormat('en-AU', {
		year: 'numeric',
		month,
		timeZone
	}).format(date);
}

/**
 *
 * @param {Date} date
 * @param {"long" | "short" | "narrow" | undefined} [weekday]
 * @param {"numeric" | "2-digit" | undefined} [day]
 * @param {DateTimeFormatMonthStyles} [month]
 * @param {"numeric" | "2-digit" | undefined} [year]
 * @param {string} [timeZone]
 * @returns
 */
export function getFormattedDate(date, weekday, day, month, year, timeZone = '+10:00') {
	return new Intl.DateTimeFormat('en-AU', {
		month,
		weekday,
		day,
		year,
		timeZone
	}).format(date);
}

/**
 * @typedef {Object} FormatDateTimeOptions
 * @property {Date} date
 * @property {"numeric" | "2-digit" | undefined} [hour]
 * @property {"numeric" | "2-digit" | undefined} [minute]
 * @property {"numeric" | "2-digit" | undefined} [second]
 * @property {"narrow" | "short" | "long" | undefined} [dayPeriod]
 * @property {"long" | "short" | "narrow" | undefined} [weekday]
 * @property {"numeric" | "2-digit" | undefined} [day]
 * @property {DateTimeFormatMonthStyles} [month]
 * @property {"numeric" | "2-digit" | undefined} [year]
 * @property {string} [timeZone]
 */

/**
 *
 * @param {FormatDateTimeOptions} options
 * @returns {string}
 */
export function formatDateTime({
	date,
	hour,
	minute,
	second,
	dayPeriod,
	weekday,
	day,
	month,
	year,
	timeZone = '+10:00'
}) {
	return new Intl.DateTimeFormat('en-AU', {
		hour,
		minute,
		second,
		dayPeriod,
		weekday,
		day,
		month,
		year,
		timeZone
	}).format(date);
}
