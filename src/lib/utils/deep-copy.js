/**
 * Deep copy utility that handles Svelte 5 reactive proxies.
 * Use this when cloning data that may originate from $state variables.
 * For plain (non-proxied) data, prefer structuredClone directly.
 * @param {*} original
 * @returns {*}
 */
function deepCopy(original) {
	if (Array.isArray(original)) {
		return original.map((elem) => deepCopy(elem));
	} else if (typeof original === 'object' && original !== null) {
		return Object.fromEntries(Object.entries(original).map(([k, v]) => [k, deepCopy(v)]));
	} else {
		return original;
	}
}

export default deepCopy;
