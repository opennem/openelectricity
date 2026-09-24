import { DEFAULT_TABLE_COLUMNS, normaliseTableColumns } from './table-columns.js';

const STORAGE_KEY = 'tracker-table-columns';

/**
 * The fuel-tech table's visible value columns. A personal display preference,
 * so it lives in localStorage rather than the URL — shared links never change
 * the recipient's columns. The stored value is restored after mount so the
 * server-rendered and hydrating tables agree. Call during component init
 * (or inside an effect root).
 */
export function createTableColumnsPreference() {
	let columns = $state([...DEFAULT_TABLE_COLUMNS]);

	// Runs once after mount: it reads storage, never tracked state.
	$effect(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw !== null) columns = normaliseTableColumns(JSON.parse(raw));
		} catch {
			// Blocked storage or an unparseable value — keep the defaults.
		}
	});

	return {
		get value() {
			return columns;
		},
		/** @param {string[]} next */
		set value(next) {
			columns = normaliseTableColumns(next);
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
			} catch {
				// Storage blocked or full — the in-memory preference still works.
			}
		}
	};
}
