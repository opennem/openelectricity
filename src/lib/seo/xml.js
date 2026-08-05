/** @type {Record<string, string>} */
const XML_ENTITIES = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };

/**
 * Escape a string for safe inclusion in XML text/attribute content.
 * @param {string} str
 */
export function escapeXml(str) {
	return str.replace(/[<>&'"]/g, (c) => XML_ENTITIES[c]);
}
