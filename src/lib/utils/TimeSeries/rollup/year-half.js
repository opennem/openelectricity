import { getMonth, set } from 'date-fns';

/**
 *
 * @param {number} month
 * @returns
 */
function getHalfYearStartMonth(month) {
	switch (month) {
		case 0:
		case 1:
		case 2:
		case 3:
		case 4:
		case 5:
			return 0;

		case 6:
		case 7:
		case 8:
		case 9:
		case 10:
		case 11:
			return 6;

		default:
	}
	return 0;
}

/**
 *
 * @param {number} time
 * @param {number} halfYearStartMonth
 * @returns
 */
function startOfHalfYear(time, halfYearStartMonth) {
	return set(time, { month: halfYearStartMonth, date: 1 });
}

/**
 *
 * @param {number} time
 * @returns {number}
 */
export default function (time) {
	const halfYearStartMonth = getHalfYearStartMonth(getMonth(time));
	const start = startOfHalfYear(time, halfYearStartMonth);
	return start.getTime();
}
