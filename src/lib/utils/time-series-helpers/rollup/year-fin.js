import getQuarter from 'date-fns/getQuarter';
import set from 'date-fns/set';
import subYears from 'date-fns/subYears';

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
 * @returns {number}
 */
export default function (time) {
	const quarter = getQuarter(time);
	const start = startOfFinYear(time, quarter);

	return start.getTime();
}
