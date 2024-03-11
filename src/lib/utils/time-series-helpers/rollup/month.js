import startOfMonth from 'date-fns/startOfMonth';

/**
 *
 * @param {number} time
 * @returns {number}
 */
export default function (time) {
	return startOfMonth(new Date(time)).getTime();
}
