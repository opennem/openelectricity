/**
 * Deep copy utility using structuredClone.
 * @param {*} original
 * @returns {*}
 */
function deepCopy(original) {
	return structuredClone(original);
}

export default deepCopy;
