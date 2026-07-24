/**
 * Named saved "views" for the tracker-map prototypes (localStorage only, per
 * milestone 1). A view captures everything needed to restore a custom
 * dashboard: mode, panel set, grid layout and filters. Follows the Stratify
 * storage pattern (per-item key + an index key), SSR-safe.
 *
 * @typedef {Object} SavedViewFilters
 * @property {string} region
 * @property {string} group
 * @property {string | null} range - Range token ('7d', 'all'…) or null for custom spans
 * @property {string} interval
 * @property {string} [start] - Custom span start (YYYY-MM-DD)
 * @property {string} [end] - Custom span end (YYYY-MM-DD)
 *
 * @typedef {Object} SavedView
 * @property {string} id
 * @property {string} name
 * @property {string} mode - Prototype-specific mode token (e.g. 'grid' | 'facilities')
 * @property {string[]} panelIds - Panel registry ids, in display order
 * @property {{ columns: string[][] } | null} layout - GridLayout state (null = derive from panelIds)
 * @property {SavedViewFilters} filters
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {{ id: string, name: string, updatedAt: string }} SavedViewMeta
 */

const VIEW_PREFIX = 'tracker-map:view:';
const INDEX_KEY = 'tracker-map:views-index';

function storageAvailable() {
	return typeof localStorage !== 'undefined';
}

function generateId() {
	return crypto.randomUUID().slice(0, 8);
}

/**
 * Save a view. Returns its id.
 * @param {Omit<SavedView, 'id' | 'createdAt' | 'updatedAt'>} view
 * @param {string} [existingId]
 * @returns {string | null}
 */
export function saveView(view, existingId) {
	if (!storageAvailable()) return null;
	const id = existingId || generateId();
	const now = new Date().toISOString();

	/** @type {SavedView} */
	const stored = {
		...view,
		id,
		createdAt: existingId ? (loadView(id)?.createdAt ?? now) : now,
		updatedAt: now
	};

	try {
		localStorage.setItem(VIEW_PREFIX + id, JSON.stringify(stored));
		updateIndex(id, stored.name, now);
	} catch {
		return null;
	}
	return id;
}

/**
 * @param {string} id
 * @returns {SavedView | null}
 */
export function loadView(id) {
	if (!storageAvailable()) return null;
	const raw = localStorage.getItem(VIEW_PREFIX + id);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

/**
 * @returns {SavedViewMeta[]}
 */
export function listViews() {
	if (!storageAvailable()) return [];
	const raw = localStorage.getItem(INDEX_KEY);
	if (!raw) return [];
	try {
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

/**
 * @param {string} id
 */
export function deleteView(id) {
	if (!storageAvailable()) return;
	localStorage.removeItem(VIEW_PREFIX + id);
	const index = listViews().filter((item) => item.id !== id);
	localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

/**
 * @param {string} id
 * @param {string} name
 * @param {string} updatedAt
 */
function updateIndex(id, name, updatedAt) {
	const index = listViews().filter((item) => item.id !== id);
	index.unshift({ id, name: name || 'Untitled view', updatedAt });
	localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}
