import { addMonths } from 'date-fns';
import { getFormattedMonth, getFormattedDate } from '$lib/utils/formatters';

/**
 * @param {string} month
 * @returns
 */
function getQuarter(month) {
	if (month === 'Jan') return 'Q1';
	if (month === 'Apr') return 'Q2';
	if (month === 'July') return 'Q3';
	if (month === 'Oct') return 'Q4';

	return month;
}
/**
 * @param {Date | undefined} date
 * @param {string} [interval]
 * @returns
 */
export default function format(date, interval) {
	if (!date) return '';
	switch (interval) {
		case '1d':
			return getFormattedDate(date, 'short', 'numeric', 'numeric', '2-digit');

		case '1M':
			return getFormattedMonth(date, 'short');

		case '1Q': {
			return (
				getQuarter(getFormattedDate(date, undefined, undefined, 'short', undefined)) +
				' ' +
				getFormattedDate(date, undefined, undefined, undefined, 'numeric')
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
