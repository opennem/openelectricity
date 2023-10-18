/**
 *
 * @param {string} prop
 * @returns {Function}
 */
export function byProp(prop) {
	return (
		/**
		 * @param {*} a
		 * @param {*} b
		 * @returns {number}
		 */
		(a, b) => {
			const nameA = a[prop].toUpperCase(); // ignore upper and lowercase
			const nameB = b[prop].toUpperCase(); // ignore upper and lowercase
			if (nameA < nameB) {
				return -1;
			}
			if (nameA > nameB) {
				return 1;
			}

			// names must be equal
			return 0;
		}
	);
}
