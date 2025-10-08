import { rollup } from 'd3-array';
import { formatDateBySpecificity } from '$lib/utils/date-format';
import getDateField from './get-date-field';

/**
 *
 * @param {*[]} data - sorted by zonedDateTime
 * @returns
 */
function groupByMonthDay(data) {
	return rollup(
		data,
		(d) => d,
		(d) => d.zonedDateTime?.year,
		(d) => {
			if (d.isToday) {
				return 'Today';
			}
			const dateField = getDateField(d.unit.status_id);
			return formatDateBySpecificity(d.unit[dateField], d.unit[dateField + '_specificity']);
		}
	);
}

export default groupByMonthDay;
