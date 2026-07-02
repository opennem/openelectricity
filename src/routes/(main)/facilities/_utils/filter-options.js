/**
 * Pure helpers for hierarchical filter option trees (region, status, technology).
 *
 * Options form a one-level tree: a top-level option either has `children`
 * (making it a parent whose own `value` is never stored in a selection) or is
 * itself a selectable leaf. Note the `battery` quirk: the `battery` parent has
 * a child that reuses the value `battery` ("Battery (Bidirectional)") — leaf-ness
 * is therefore always derived from tree position, never from the value alone.
 *
 * @typedef {Object} FilterOption
 * @property {string} value
 * @property {string} label
 * @property {string} [colour]
 * @property {FilterOption[]} [children]
 */

/**
 * All selectable leaf values: children of parents, plus childless top-level options.
 * @param {FilterOption[]} options
 * @returns {string[]}
 */
export function getLeafValues(options) {
	/** @type {string[]} */
	const leaves = [];
	for (const opt of options) {
		if (opt.children?.length) {
			for (const child of opt.children) {
				leaves.push(child.value);
			}
		} else {
			leaves.push(opt.value);
		}
	}
	return leaves;
}

/**
 * Number of selected leaf values (ignores any stray non-leaf values in `selected`).
 * @param {FilterOption[]} options
 * @param {string[]} selected
 * @returns {number}
 */
export function countSelectedLeaves(options, selected) {
	const leafSet = new Set(getLeafValues(options));
	return selected.filter((value) => leafSet.has(value)).length;
}

/**
 * Case-insensitive label search preserving the tree shape:
 * - a matching parent is kept with ALL of its children
 * - a matching child keeps its parent but prunes non-matching siblings
 * - a non-matching parent with no matching children is removed
 * Returns the original array when the term is blank.
 * @param {FilterOption[]} options
 * @param {string} term
 * @returns {FilterOption[]}
 */
export function filterOptionsBySearch(options, term) {
	const query = term.trim().toLowerCase();
	if (!query) return options;

	/** @type {FilterOption[]} */
	const filtered = [];
	for (const opt of options) {
		const parentMatches = opt.label.toLowerCase().includes(query);
		if (opt.children?.length) {
			if (parentMatches) {
				filtered.push(opt);
				continue;
			}
			const matchingChildren = opt.children.filter((child) =>
				child.label.toLowerCase().includes(query)
			);
			if (matchingChildren.length) {
				filtered.push({ ...opt, children: matchingChildren });
			}
		} else if (parentMatches) {
			filtered.push(opt);
		}
	}
	return filtered;
}

/**
 * One-line summary of the selected leaves in option order,
 * e.g. 'Operating, Committed' or 'WA, SA + 1 more'.
 * @param {FilterOption[]} options
 * @param {string[]} selected
 * @param {{max?: number, labelMap?: Record<string, string>}} [opts] - labelMap overrides option labels (e.g. short region names)
 * @returns {string}
 */
export function summariseSelection(options, selected, { max = 2, labelMap } = {}) {
	/** @type {string[]} */
	const labels = [];
	for (const opt of options) {
		if (opt.children?.length) {
			for (const child of opt.children) {
				if (selected.includes(child.value)) {
					labels.push(labelMap?.[child.value] ?? child.label);
				}
			}
		} else if (selected.includes(opt.value)) {
			labels.push(labelMap?.[opt.value] ?? opt.label);
		}
	}

	if (labels.length === 0) return '';
	const shown = labels.slice(0, max).join(', ');
	const remaining = labels.length - max;
	return remaining > 0 ? `${shown} + ${remaining} more` : shown;
}
