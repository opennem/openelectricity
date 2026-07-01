/**
 * Portable Text presence check that ignores empty blocks — a `block` entry only
 * counts when a child has non-whitespace text; custom embeds (images, callouts,
 * etc.) always count. Shared by the facility detail surfaces so the "no
 * description" placeholder logic stays consistent.
 *
 * @param {any[]} blocks
 * @returns {boolean}
 */
export function hasPortableTextContent(blocks) {
	if (!Array.isArray(blocks)) return false;
	return blocks.some((b) => {
		if (!b || typeof b !== 'object') return false;
		if (b._type !== 'block') return true;
		return (b.children ?? []).some(
			(/** @type {any} */ c) => typeof c?.text === 'string' && c.text.trim().length > 0
		);
	});
}
