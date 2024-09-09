/**
 * @param {string} text
 */
export async function writeToClipboard(text) {
	try {
		await navigator.clipboard.writeText(text);
	} catch (/** @type {*} */ error) {
		console.error(error.message);
	}
}
