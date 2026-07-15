/**
 * Parse the year from an ISO-ish date string.
 * @param {any} dateValue
 * @returns {number | null}
 */
export default function parseYear(dateValue) {
	if (!dateValue || typeof dateValue !== 'string') return null;
	const year = parseInt(dateValue.substring(0, 4), 10);
	return isNaN(year) ? null : year;
}
