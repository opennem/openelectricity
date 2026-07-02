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

/**
 * Ensure every top-level Portable Text block has a unique `_key`.
 * `@portabletext/svelte` renders blocks in an each keyed by `_key`, so
 * duplicate keys (seen in migration-generated facility descriptions) throw
 * `each_key_duplicate` and crash the page. Later duplicates get a `-dup-<n>`
 * suffix; input with unique keys is returned unchanged (same reference).
 *
 * @param {any} blocks
 * @returns {any}
 */
export function dedupePortableTextKeys(blocks) {
	if (!Array.isArray(blocks)) return blocks;
	/** @type {Set<string>} */
	const seen = new Set();
	let changed = false;
	const result = blocks.map((b) => {
		const key = b?._key;
		if (typeof key !== 'string' || !seen.has(key)) {
			if (typeof key === 'string') seen.add(key);
			return b;
		}
		let n = 0;
		let next;
		do {
			next = `${key}-dup-${++n}`;
		} while (seen.has(next));
		seen.add(next);
		changed = true;
		return { ...b, _key: next };
	});
	return changed ? result : blocks;
}
