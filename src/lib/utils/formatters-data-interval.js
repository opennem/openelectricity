import { addMonths } from 'date-fns';
import { getFormattedMonth, getFormattedDate } from '$lib/utils/formatters';

/**
 * @param {string} month
 * @returns
 */
function getQuarter(month) {
	if (month === 'January') return 'Q1';
	if (month === 'April') return 'Q2';
	if (month === 'July') return 'Q3';
	if (month === 'October') return 'Q4';
}
/**
 * @param {Date} date
 * @param {string} [interval]
 * @returns
 */
export default function format(date, interval) {
	switch (interval) {
		case '1d':
			return getFormattedDate(date, undefined, 'numeric', 'short', 'numeric');

		case '1M':
			return getFormattedMonth(date, 'short');

		case '1Q': {
			return (
				getQuarter(getFormattedDate(date, undefined, undefined, 'long', undefined)) +
				' ' +
				getFormattedMonth(date)
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
