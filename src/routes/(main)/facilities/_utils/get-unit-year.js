import getDateField from './get-date-field';

/**
 * Extract the relevant year from a unit based on its status.
 * Uses commencement_date for operating/commissioning, expected_operation_date
 * for committed, and closure_date for retired.
 *
 * @param {any} unit
 * @returns {number | null} The year, or null if no date is available
 */
export default function getUnitYear(unit) {
	const dateField = getDateField(unit.status_id);
	const dateValue = unit[dateField];
	if (!dateValue || typeof dateValue !== 'string') return null;

	const year = parseInt(dateValue.substring(0, 4), 10);
	return isNaN(year) ? null : year;
}
