/**
 * Storage utilities for Stratify chart persistence.
 * Local storage (localStorage) for the builder, plus JSON file export/import
 * for moving configs between browsers or into Sanity CMS.
 */

/**
 * @typedef {Object} SavedChartMeta
 * @property {string} id
 * @property {string} title
 * @property {string} updatedAt
 *
 * @typedef {import('$lib/stratify/StratifyProject.svelte.js').StratifyProjectSnapshot & { id: string, createdAt: string, updatedAt: string }} SavedChart
 */

const LOCAL_PREFIX = 'stratify:chart:';
const LOCAL_INDEX_KEY = 'stratify:index';

/**
 * Generate a short random ID.
 * @returns {string}
 */
function generateId() {
	return crypto.randomUUID().slice(0, 8);
}

// --- Local storage ---

/**
 * Save a project snapshot to localStorage. Returns the chart ID.
 * @param {import('$lib/stratify/StratifyProject.svelte.js').StratifyProjectSnapshot} snapshot
 * @param {string} [existingId]
 * @returns {string}
 */
export function saveChart(snapshot, existingId) {
	const id = existingId || generateId();
	const now = new Date().toISOString();

	/** @type {SavedChart} */
	const chart = {
		...snapshot,
		id,
		createdAt: existingId ? (loadChart(id)?.createdAt ?? now) : now,
		updatedAt: now
	};

	localStorage.setItem(LOCAL_PREFIX + id, JSON.stringify(chart));
	updateIndex(id, snapshot.title, now);
	return id;
}

/**
 * Load a project snapshot by ID from localStorage.
 * @param {string} id
 * @returns {SavedChart | null}
 */
export function loadChart(id) {
	const raw = localStorage.getItem(LOCAL_PREFIX + id);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

/**
 * List saved charts from localStorage.
 * @returns {SavedChartMeta[]}
 */
export function listCharts() {
	const raw = localStorage.getItem(LOCAL_INDEX_KEY);
	if (!raw) return [];
	try {
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

/**
 * Delete a saved chart from localStorage.
 * @param {string} id
 */
export function deleteChart(id) {
	localStorage.removeItem(LOCAL_PREFIX + id);
	const index = listCharts().filter((item) => item.id !== id);
	localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(index));
}

/**
 * Update the local index with a chart entry.
 * @param {string} id
 * @param {string} title
 * @param {string} updatedAt
 */
function updateIndex(id, title, updatedAt) {
	const index = listCharts().filter((item) => item.id !== id);
	index.unshift({ id, title: title || 'Untitled', updatedAt });
	localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(index));
}

// --- JSON file export/import ---

/**
 * Export a project snapshot as a downloadable JSON file.
 * @param {import('$lib/stratify/StratifyProject.svelte.js').StratifyProjectSnapshot} snapshot
 * @param {string} [filename]
 */
export function exportToFile(snapshot, filename) {
	const name = filename || `${snapshot.title || 'chart'}.json`;
	const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Import a project snapshot from a JSON file.
 * Opens a file picker and returns the parsed snapshot.
 * @returns {Promise<import('$lib/stratify/StratifyProject.svelte.js').StratifyProjectSnapshot | null>}
 */
export function importFromFile() {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';

		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) {
				resolve(null);
				return;
			}

			try {
				const text = await file.text();
				const snapshot = JSON.parse(text);

				// Basic validation
				if (!snapshot.csvText && !snapshot.title) {
					resolve(null);
					return;
				}

				resolve(snapshot);
			} catch {
				resolve(null);
			}
		};

		input.oncancel = () => resolve(null);
		input.click();
	});
}
