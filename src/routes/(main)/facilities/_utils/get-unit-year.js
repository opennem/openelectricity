import getDateField from './get-date-field';
import parseYear from './parse-year';

/**
 * Extract the relevant year from a unit based on its status.
 * Uses commencement_date for operating/commissioning, expected_operation_date
 * for committed, and closure_date for retired.
 *
 * @param {any} unit
 * @returns {number | null} The year, or null if no date is available
 */
export default function getUnitYear(unit) {
	return parseYear(unit[getDateField(unit.status_id)]);
}
