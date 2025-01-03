import { startOfQuarter } from 'date-fns';

/**
 *
 * @param {number} time
 * @returns {number}
 */
export default function (time) {
	return startOfQuarter(new Date(time)).getTime();
}
