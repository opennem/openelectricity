import { addYears, endOfMonth, subYears, getQuarter, set } from 'date-fns';

/**
 *
 * @param {number} time
 * @param {number} quarter
 * @returns {Date}
 */
function startOfFinYear(time, quarter) {
	// 1, 2 quarter should be -1 year in july
	// 3, 4 quarter should this year in july
	const start = set(new Date(time), { month: 6, date: 1 });
	return quarter === 1 || quarter === 2 ? subYears(start, 1) : start;
}

/**
 *
 * @param {number} time
 * @param {number} quarter
 * @returns {Date}
 */
function endOfFinYear(time, quarter) {
	// 1, 2 quarter should be this year in june (end of)
	// 3, 4 quarter should +1 year
	const end = endOfMonth(set(new Date(time), { month: 5 }));
	return quarter === 3 || quarter === 4 ? addYears(end, 1) : end;
}

/**
 *
 * @param {number} time
 * @returns {number}
 */
export default function (time) {
	const quarter = getQuarter(time);
	const start = startOfFinYear(time, quarter);
	const end = endOfFinYear(time, quarter);

	return end.getTime();
}
