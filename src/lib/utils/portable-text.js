/**
 * Flatten a Sanity portable-text block array into plain paragraph strings.
 * Only `_type === 'block'` entries are included; empty paragraphs are dropped.
 *
 * @param {any[] | null | undefined} blocks
 * @returns {string[]}
 */
export function extractParagraphs(blocks) {
	if (!blocks?.length) return [];
	return blocks
		.filter((/** @type {any} */ b) => b._type === 'block')
		.map(
			(/** @type {any} */ b) =>
				b.children?.map((/** @type {any} */ c) => c.text).join('') || ''
		)
		.filter(Boolean);
}
