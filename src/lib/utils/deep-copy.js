/**
 * deep copy utility
 * - possibly replace this with structuredClone later when support is widespread
 * - https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
 * @param {*} original
 * @returns {*}
 */
function deepCopy(original) {
	if (Array.isArray(original)) {
		return original.map((elem) => deepCopy(elem));
	} else if (typeof original === 'object' && original !== null) {
		return Object.fromEntries(Object.entries(original).map(([k, v]) => [k, deepCopy(v)]));
	} else {
		// Primitive value: atomic, no need to copy
		return original;
	}
}

export default deepCopy;
