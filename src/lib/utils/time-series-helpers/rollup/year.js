import startOfYear from 'date-fns/startOfYear';

/**
 *
 * @param {number} time
 * @returns {number}
 */
export default function (time) {
	return startOfYear(new Date(time)).getTime();
}
