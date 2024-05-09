import { startOfMonth } from 'date-fns';

/**
 *
 * @param {number} time
 * @returns {number}
 */
export default function (time) {
	return startOfMonth(new Date(time)).getTime();
}
