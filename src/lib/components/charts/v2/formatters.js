/**
 * Date formatters and day-start helpers for facility charts.
 *
 * All functions accept the IANA timezone and offset explicitly so they
 * remain pure and testable.
 */

/**
 * Format a date for X-axis tick labels (day starts only).
 *
 * @param {Date | any} d
 * @param {string} ianaTimeZone - e.g. 'Australia/Brisbane'
 * @returns {string}
 */
export function formatXAxis(d, ianaTimeZone) {
	const date = d instanceof Date ? d : typeof d === 'number' ? new Date(d) : null;
	if (!date) return String(d);

	return new Intl.DateTimeFormat('en-AU', {
		day: 'numeric',
		month: 'short',
		timeZone: ianaTimeZone
	}).format(date);
}

/**
 * Format a date range for x-axis labels in step/energy mode.
 *
 * Same month:      "21 — 27 Jan"
 * Different month:  "28 Jan — 3 Feb"
 * Different year:   "28 Dec '25 — 3 Jan '26"
 *
 * @param {Date} start
 * @param {Date} end
 * @param {string} ianaTimeZone
 * @returns {string}
 */
export function formatDateRange(start, end, ianaTimeZone) {
	const partsFmt = new Intl.DateTimeFormat('en-AU', {
		day: 'numeric',
		month: 'short',
		year: '2-digit',
		timeZone: ianaTimeZone
	});

	const sParts = partsFmt.formatToParts(start);
	const eParts = partsFmt.formatToParts(end);

	const sDay = sParts.find((p) => p.type === 'day')?.value;
	const eDay = eParts.find((p) => p.type === 'day')?.value;
	const sMonth = sParts.find((p) => p.type === 'month')?.value;
	const eMonth = eParts.find((p) => p.type === 'month')?.value;
	const sYear = sParts.find((p) => p.type === 'year')?.value;
	const eYear = eParts.find((p) => p.type === 'year')?.value;

	if (sYear !== eYear) {
		return `${sDay} ${sMonth} '${sYear} \u2014 ${eDay} ${eMonth} '${eYear}`;
	}
	if (sMonth !== eMonth) {
		return `${sDay} ${sMonth} \u2014 ${eDay} ${eMonth}`;
	}
	return `${sDay} \u2014 ${eDay} ${eMonth}`;
}

/**
 * Get the start of the day in the facility's timezone, returned as a UTC Date.
 *
 * @param {Date} date
 * @param {string} ianaTimeZone - e.g. 'Australia/Brisbane'
 * @param {string} timeZone     - offset string, e.g. '+10:00'
 * @returns {Date}
 */
export function getStartOfDay(date, ianaTimeZone, timeZone) {
	const formatter = new Intl.DateTimeFormat('en-AU', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: ianaTimeZone
	});
	const parts = formatter.formatToParts(date);
	const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0');
	const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0') - 1;
	const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0');

	const offsetHours = timeZone === '+08:00' ? 8 : 10;
	return new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));
}

/**
 * Compute day-start dates from series data for power-mode gridlines.
 *
 * @param {any[]} data          - Series data with `date` or `time` property
 * @param {string} ianaTimeZone
 * @param {string} timeZone     - offset string
 * @returns {Date[]}
 */
export function getDayStartDates(data, ianaTimeZone, timeZone) {
	if (!data?.length) return [];

	const dayStarts = new Set();
	/** @type {Date[]} */
	const result = [];

	for (const d of data) {
		const date = d.date || new Date(d.time);
		const dayStart = getStartOfDay(date, ianaTimeZone, timeZone);
		const key = dayStart.getTime();

		if (!dayStarts.has(key)) {
			dayStarts.add(key);
			result.push(dayStart);
		}
	}

	return result.sort((a, b) => a.getTime() - b.getTime());
}
