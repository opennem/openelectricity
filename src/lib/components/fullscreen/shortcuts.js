/**
 * Shortcuts shared by the full-screen pages' keyboard-shortcuts modals
 * (`ShortcutsToast`). FullscreenNavDropdown handles the nav-menu key; each
 * page handles its own full-screen and "?" keys.
 *
 * @typedef {{ label: string, keys: string[] }} Shortcut
 */

export const NAV_MENU_KEY = 'g';

/** @type {Shortcut} */
export const NAV_MENU_SHORTCUT = { label: 'Toggle navigation menu', keys: ['G'] };
/** @type {Shortcut} */
export const FULLSCREEN_SHORTCUT = { label: 'Enter / exit full screen', keys: ['F'] };
/** @type {Shortcut} */
export const SHOW_SHORTCUTS_SHORTCUT = { label: 'Show shortcuts', keys: ['?'] };

/**
 * A page's shortcuts-modal list: its own entries, then the shared ones in a
 * fixed order — the nav menu while it is on screen, full screen (followed by
 * any related page entries) where the page can toggle it, and "Show
 * shortcuts" last.
 *
 * @param {Shortcut[]} own
 * @param {{ navMenu?: boolean, fullscreen?: boolean, fullscreenRelated?: Shortcut[] }} [options]
 * @returns {Shortcut[]}
 */
export function pageShortcuts(
	own,
	{ navMenu = false, fullscreen = false, fullscreenRelated = [] } = {}
) {
	return [
		...own,
		...(navMenu ? [NAV_MENU_SHORTCUT] : []),
		...(fullscreen ? [FULLSCREEN_SHORTCUT, ...fullscreenRelated] : []),
		SHOW_SHORTCUTS_SHORTCUT
	];
}
