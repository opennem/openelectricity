/**
 *
 * @param {number} time
 * @param {number} coeff
 * @returns
 */
export function key(time, coeff) {
	return Math.round(time / coeff) * coeff;
}
