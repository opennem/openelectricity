/**
 * Pure helpers for GridLayout state management.
 *
 * A layout is represented as `{ columns: string[][] }` — an array of columns,
 * each column an ordered list of item ids. The length of `columns` matches the
 * current column count (1 for single, 2 for multi, etc.).
 */

/**
 * @typedef {{ columns: string[][] }} GridLayoutState
 */

/**
 * Deep-clone a layout so callers never mutate shared references.
 * @param {GridLayoutState} layout
 * @returns {GridLayoutState}
 */
function clone(layout) {
	return { columns: layout.columns.map((col) => [...col]) };
}

/**
 * Split an array into `columnCount` near-equal chunks, preserving order.
 * Earlier columns get the extra items when the split is uneven
 * (e.g. 3 items into 2 columns → [2, 1]).
 * @param {string[]} ids
 * @param {number} columnCount
 * @returns {string[][]}
 */
function splitInto(ids, columnCount) {
	if (columnCount <= 1) return [ids.slice()];
	const perColBase = Math.floor(ids.length / columnCount);
	const remainder = ids.length % columnCount;
	/** @type {string[][]} */
	const cols = [];
	let cursor = 0;
	for (let i = 0; i < columnCount; i++) {
		const size = perColBase + (i < remainder ? 1 : 0);
		cols.push(ids.slice(cursor, cursor + size));
		cursor += size;
	}
	return cols;
}

/**
 * Migrate a layout to a different column count.
 * - 2 → 1: concatenate columns in order.
 * - 1 → N: spread items across N columns, earlier columns getting extras.
 * - N → N: returns an equivalent (cloned) layout.
 *
 * @param {GridLayoutState} layout
 * @param {number} newColumnCount
 * @returns {GridLayoutState}
 */
export function migrateColumns(layout, newColumnCount) {
	if (newColumnCount < 1) newColumnCount = 1;
	const current = layout.columns.length;
	if (current === newColumnCount) return clone(layout);

	const flat = layout.columns.flat();
	return { columns: splitInto(flat, newColumnCount) };
}

/**
 * Normalize a (possibly stale or partial) layout against the current set of
 * available item ids and column count.
 *
 * - Removes ids that are no longer in `availableIds`.
 * - Appends new ids (present in `availableIds` but missing from the layout)
 *   to the last column, preserving the order they appear in `availableIds`.
 * - Resizes the column array to `columnCount` via `migrateColumns`.
 *
 * Returns a fresh layout containing every id exactly once.
 *
 * @param {GridLayoutState | null | undefined} stored
 * @param {string[]} availableIds
 * @param {number} columnCount
 * @returns {GridLayoutState}
 */
export function normalizeLayout(stored, availableIds, columnCount) {
	const cols = columnCount < 1 ? 1 : columnCount;
	const available = new Set(availableIds);

	/** @type {GridLayoutState} */
	let base;
	if (!stored || !Array.isArray(stored.columns) || stored.columns.length === 0) {
		base = { columns: splitInto(availableIds.slice(), cols) };
		return base;
	}

	// Filter out ids no longer present
	const filtered = stored.columns.map((col) =>
		Array.isArray(col) ? col.filter((id) => typeof id === 'string' && available.has(id)) : []
	);

	// Find ids not yet placed anywhere and append to the last (possibly only) column
	const placed = new Set(filtered.flat());
	const missing = availableIds.filter((id) => !placed.has(id));
	if (missing.length > 0) {
		const lastIdx = filtered.length - 1;
		filtered[lastIdx] = [...filtered[lastIdx], ...missing];
	}

	base = { columns: filtered };

	// Resize columns if needed
	if (base.columns.length !== cols) {
		base = migrateColumns(base, cols);
	}

	return base;
}

/**
 * Locate an item id within a layout.
 * @param {GridLayoutState} layout
 * @param {string} itemId
 * @returns {{ column: number, index: number } | null}
 */
function locate(layout, itemId) {
	for (let c = 0; c < layout.columns.length; c++) {
		const idx = layout.columns[c].indexOf(itemId);
		if (idx !== -1) return { column: c, index: idx };
	}
	return null;
}

/**
 * Move an item to a target column + index. Clamps `toIndex` to the length of
 * the destination column. If `itemId` isn't in the layout, returns the layout
 * unchanged (cloned).
 *
 * @param {GridLayoutState} layout
 * @param {string} itemId
 * @param {number} toColumn
 * @param {number} toIndex
 * @returns {GridLayoutState}
 */
export function moveItem(layout, itemId, toColumn, toIndex) {
	const next = clone(layout);
	const from = locate(next, itemId);
	if (!from) return next;

	const targetCol = Math.max(0, Math.min(toColumn, next.columns.length - 1));
	// Remove from source
	next.columns[from.column].splice(from.index, 1);

	const destArr = next.columns[targetCol];
	// If we removed from the same column before the insertion point, adjust index
	let destIdx = toIndex;
	if (from.column === targetCol && from.index < toIndex) destIdx -= 1;
	destIdx = Math.max(0, Math.min(destIdx, destArr.length));
	destArr.splice(destIdx, 0, itemId);
	return next;
}

/**
 * Replace a single column's contents with a new ordering (used by dnd
 * onconsider / onfinalize events which hand us the full updated list).
 *
 * @param {GridLayoutState} layout
 * @param {number} columnIndex
 * @param {string[]} newOrder
 * @returns {GridLayoutState}
 */
export function applyDndReorder(layout, columnIndex, newOrder) {
	if (columnIndex < 0 || columnIndex >= layout.columns.length) return clone(layout);
	const next = clone(layout);
	next.columns[columnIndex] = [...newOrder];
	return next;
}

/**
 * Load a layout from localStorage. SSR-safe: returns `null` when `window` is
 * undefined. Returns `null` on missing key or corrupted JSON (never throws).
 *
 * @param {string} storageKey
 * @returns {GridLayoutState | null}
 */
export function loadLayout(storageKey) {
	if (typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem(storageKey);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || !Array.isArray(parsed.columns)) return null;
		// Shallow structural check: columns should be arrays of strings
		const columns = parsed.columns.map(
			(/** @type {unknown} */ col) =>
				Array.isArray(col) ? col.filter((/** @type {unknown} */ v) => typeof v === 'string') : []
		);
		return { columns };
	} catch {
		return null;
	}
}

/**
 * Save a layout to localStorage. SSR-safe and failure-safe — swallows any
 * error (quota exceeded, disabled storage, etc.) since this is a UX niceness,
 * not a correctness requirement.
 *
 * @param {string} storageKey
 * @param {GridLayoutState} layout
 * @returns {void}
 */
export function saveLayout(storageKey, layout) {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(storageKey, JSON.stringify(layout));
	} catch {
		// ignore
	}
}
