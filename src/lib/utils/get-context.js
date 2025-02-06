import { getContext, hasContext } from 'svelte';

/**
 * @param {symbol} key
 */
export default function (key) {
	if (!hasContext(key)) {
		let name = String(key);
		throw new Error(`Svelte context ${name} not found`);
	}

	return getContext(key);
}
