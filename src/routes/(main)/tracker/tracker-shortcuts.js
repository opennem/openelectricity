/**
 * The tracker's single-key shortcuts: bare letters (no modifiers) that are
 * ignored while typing in a field or an editable element. One list feeds the
 * keydown handler, the Options menu badges and the shortcuts modal.
 */

/** @typedef {'refresh' | 'metrics' | 'fullscreen' | 'shortcuts'} TrackerShortcut */

/** @type {Array<{id: TrackerShortcut, key: string, keys: string[], label: string}>} */
export const TRACKER_SHORTCUTS = [
	{ id: 'refresh', key: 'r', keys: ['R'], label: 'Refresh data' },
	{ id: 'metrics', key: 'm', keys: ['M'], label: 'Show or hide metrics' },
	{ id: 'fullscreen', key: 'f', keys: ['F'], label: 'Enter / exit full screen' },
	{ id: 'shortcuts', key: '?', keys: ['?'], label: 'Show shortcuts' }
];

/** @param {EventTarget | null} target */
function isTyping(target) {
	if (!(target instanceof HTMLElement)) return false;
	return (
		target.isContentEditable ||
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	);
}

/**
 * The shortcut a keydown invokes, or null: the bare key with no modifier
 * (Shift is allowed only for `?`, which needs it), and never while typing.
 * @param {KeyboardEvent} event
 * @returns {TrackerShortcut | null}
 */
export function shortcutFor(event) {
	if (event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return null;
	const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
	const match = TRACKER_SHORTCUTS.find((shortcut) => shortcut.key === key);
	if (!match) return null;
	if (event.shiftKey && match.key !== '?') return null;
	return match.id;
}
