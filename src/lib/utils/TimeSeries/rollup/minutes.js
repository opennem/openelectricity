/**
 *
 * @param {number} time
 * @param {number} coeff
 * @returns {number}
 */
export default function (time, coeff) {
	return Math.round(time / coeff) * coeff;
}
