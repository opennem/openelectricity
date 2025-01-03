import { addMonths } from 'date-fns';
import { getFormattedMonth, getFormattedDate } from '$lib/utils/formatters';

/**
 * @param {Date} date
 * @param {string} [interval]
 * @returns
 */
export default function format(date, interval) {
	switch (interval) {
		case '1M':
			return getFormattedMonth(date, 'short');

		case '1Q': {
			const endMonth = addMonths(date, 2);
			return (
				getFormattedDate(date, undefined, undefined, 'short', undefined) +
				' - ' +
				getFormattedMonth(endMonth, 'short')
			);
		}
		case '6M': {
			const endMonth = addMonths(date, 5);
			return (
				getFormattedDate(date, undefined, undefined, 'short', undefined) +
				' - ' +
				getFormattedMonth(endMonth, 'short')
			);
		}
		case '1Y':
			return getFormattedMonth(date);

		default:
			return getFormattedMonth(date);
	}
}
