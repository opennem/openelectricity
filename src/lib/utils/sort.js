/**
 * @param {string} prop
 * @returns {Function} sort function
 */
export function byProp(prop) {
	return (
		/**
		 * @param {*} a
		 * @param {*} b
		 * @returns {number}
		 */
		(a, b) => {
			const propA = a[prop].toUpperCase();
			const propB = b[prop].toUpperCase();
			if (propA < propB) {
				return -1;
			}
			if (propA > propB) {
				return 1;
			}

			return 0;
		}
	);
}
