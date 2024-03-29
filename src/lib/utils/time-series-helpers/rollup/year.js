import { startOfYear } from 'date-fns';

/**
 *
 * @param {number} time
 * @returns {number}
 */
export default function (time) {
	return startOfYear(new Date(time)).getTime();
}
