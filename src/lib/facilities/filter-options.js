/**
 * Pure helpers for hierarchical filter option trees (region, status, type).
 *
 * Options form a tree of arbitrary depth: a node either has `children`
 * (making it a group whose own `value` is never stored in a selection) or is
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
 * All selectable leaf values, at any depth.
 * @param {FilterOption[]} options
 * @returns {string[]}
 */
export function getLeafValues(options) {
	/** @type {string[]} */
	const leaves = [];
	for (const opt of options) {
		if (opt.children?.length) {
			leaves.push(...getLeafValues(opt.children));
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
 * Toggle a single leaf value in a selection: meta-press selects only that
 * value; otherwise the value is added or removed.
 * @param {string[]} currentSelection
 * @param {string} value
 * @param {boolean} isMetaPressed
 * @returns {string[]}
 */
export function toggleSelection(currentSelection, value, isMetaPressed) {
	if (isMetaPressed) return [value];
	if (currentSelection.includes(value)) {
		return currentSelection.filter((item) => item !== value);
	}
	return [...currentSelection, value];
}

/**
 * Toggle a group's leaf values in a selection: meta-press selects only the
 * group; otherwise a fully-selected group is removed, a partial one is
 * unioned in.
 * @param {string[]} currentSelection
 * @param {string[]} values
 * @param {boolean} isMetaPressed
 * @returns {string[]}
 */
export function toggleGroupSelection(currentSelection, values, isMetaPressed) {
	if (isMetaPressed) return [...values];
	const allSelected = values.every((v) => currentSelection.includes(v));
	return allSelected
		? currentSelection.filter((item) => !values.includes(item))
		: [...new Set([...currentSelection, ...values])];
}

/**
 * Dispatch a FilterOptionList change onto a selection: group rows emit their
 * descendant leaf values as an array, leaves emit a single value.
 * @param {string[]} currentSelection
 * @param {string | string[]} value
 * @param {boolean} isMetaPressed
 * @returns {string[]}
 */
export function toggleInSelection(currentSelection, value, isMetaPressed) {
	return Array.isArray(value)
		? toggleGroupSelection(currentSelection, value, isMetaPressed)
		: toggleSelection(currentSelection, value, isMetaPressed);
}

/**
 * Order-insensitive selection equality — "is this filter at its default?".
 * The linchpin of the literal "ticked = shown" model: badges, tags and URL
 * serialisation all key off this one predicate.
 * @param {string[]} values
 * @param {string[]} defaults
 * @returns {boolean}
 */
export function isDefaultSelection(values, defaults) {
	return values.length === defaults.length && defaults.every((value) => values.includes(value));
}

/**
 * Deviation-aware active count for a filter's badge. Under "ticked = shown",
 * raw selected counts are permanent noise (a fresh page has most boxes
 * ticked): a filter only counts as active when it deviates from its default,
 * and an empty (nothing-shown) selection counts as 1.
 * @param {FilterOption[]} options
 * @param {string[]} selected
 * @param {string[]} defaults
 * @returns {number}
 */
export function activeLeafCount(options, selected, defaults) {
	if (isDefaultSelection(selected, defaults)) return 0;
	return Math.max(countSelectedLeaves(options, selected), 1);
}

/**
 * Serialise a literal "ticked = shown" selection for the URL: the default
 * selection is omitted entirely (null), an empty selection becomes the
 * explicit 'none' sentinel (so a reload doesn't resurrect everything), and
 * anything else is the ticked subset. `parseSelection` is the inverse.
 * @param {string[]} values
 * @param {string[]} defaults
 * @returns {string | null}
 */
export function serialiseSelection(values, defaults) {
	if (isDefaultSelection(values, defaults)) return null;
	return values.length ? values.join(',') : 'none';
}

/**
 * Parse a literal "ticked = shown" URL param: an omitted param means the
 * default selection, 'none' means nothing selected, anything else is the
 * ticked subset. Inverse of `serialiseSelection`.
 * @param {string | null} param
 * @param {string[]} defaults
 * @returns {string[]}
 */
export function parseSelection(param, defaults) {
	if (param === 'none') return [];
	return param ? param.split(',').filter(Boolean) : [...defaults];
}

/**
 * Case-insensitive label search preserving the tree shape, at any depth:
 * - a matching group is kept with ALL of its descendants
 * - a matching descendant keeps its ancestors but prunes non-matching siblings
 * - a non-matching group with no matching descendants is removed
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
		const matches = opt.label.toLowerCase().includes(query);
		if (opt.children?.length) {
			if (matches) {
				filtered.push(opt);
				continue;
			}
			const matchingChildren = filterOptionsBySearch(opt.children, term);
			if (matchingChildren.length) {
				filtered.push({ ...opt, children: matchingChildren });
			}
		} else if (matches) {
			filtered.push(opt);
		}
	}
	return filtered;
}

/**
 * Labels of the selected leaves in option order (any depth) — e.g. for the
 * mobile filter sheet's selection tags.
 * @param {FilterOption[]} options
 * @param {string[]} selected
 * @param {{labelMap?: Record<string, string>}} [opts] - labelMap overrides option labels (e.g. short region names)
 * @returns {string[]}
 */
export function getSelectedLabels(options, selected, { labelMap } = {}) {
	/** @type {string[]} */
	const labels = [];
	for (const opt of options) {
		if (opt.children?.length) {
			labels.push(...getSelectedLabels(opt.children, selected, { labelMap }));
		} else if (selected.includes(opt.value)) {
			labels.push(labelMap?.[opt.value] ?? opt.label);
		}
	}
	return labels;
}
