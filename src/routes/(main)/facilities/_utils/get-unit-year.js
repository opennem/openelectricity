import { parseAbsolute } from '@internationalized/date';
import { stripDateTimezone } from '$lib/utils/date-format';
import getDateField from './get-date-field';

/**
 * Extract the year from a unit's relevant date field.
 * Uses the same parsing logic as Timeline (parseAbsolute + stripDateTimezone + offset).
 * @param {any} unit
 * @param {string} networkId - 'NEM' or 'WEM'
 * @returns {number | null}
 */
export default function getUnitYear(unit, networkId) {
	const dateField = getDateField(unit.status_id);
	const dateValue = unit[dateField];
	if (!dateValue) return null;

	try {
		const offset = networkId === 'WEM' ? '+08:00' : '+10:00';
		const parsed = parseAbsolute(stripDateTimezone(dateValue) + 'Z', offset);
		return parsed.year;
	} catch {
		return null;
	}
}
