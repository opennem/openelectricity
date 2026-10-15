/**
 * Deep copy utility that handles Svelte 5 reactive proxies.
 * Use this when cloning data that may originate from $state variables.
 * Also used for plain data in modules the Tracker widget loads: the widget is
 * embedded on other sites and still opened in browsers without structuredClone.
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
