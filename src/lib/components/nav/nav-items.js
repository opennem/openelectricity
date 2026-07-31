import { windowedHref } from '$lib/utils/fullscreen-mode.js';

/**
 * @typedef {Object} NavItem
 * @property {string} name
 * @property {string} href
 * @property {NavItem[]} [children]
 * @property {boolean} [show]
 * @property {boolean} [beta]
 * @property {boolean} [dropdownOnly] - Rendered only by the fullscreen logo
 *   dropdown, never the header nav — for in-development entries.
 */

/**
 * Build the main site nav items. `trackerLink` is resolved at call time so
 * the consumer controls when to read from the `dataTrackerLink` store.
 *
 * `featureFlags` gates experimental nav entries — e.g. `tracker2_nav`
 * surfaces the new Explorer dashboard.
 *
 * `windowed: true` makes links to fullscreen-by-default pages (/facilities)
 * open in windowed mode via `?fullscreen=false` — used by the global Nav,
 * whose chrome only shows on windowed pages. The fullscreen nav dropdown
 * keeps the plain links so those pages stay fullscreen.
 *
 * @param {string} trackerLink
 * @param {Record<string, boolean>} [featureFlags]
 * @param {{ windowed?: boolean }} [options]
 * @returns {NavItem[]}
 */
export function getNavItems(trackerLink, featureFlags = {}, { windowed = false } = {}) {
	/** @type {NavItem[]} */
	const items = [
		{ name: 'Tracker', href: trackerLink },
		// tracker_nav: the in-development Tracker map page is dropdown-only —
		// Nav.svelte skips dropdownOnly items (see docs/feature-flags.md). The
		// (alpha) suffix distinguishes it from the legacy data-tracker entry
		// above, which it will eventually replace.
		...(featureFlags.tracker_nav
			? [{ name: 'Tracker (alpha)', href: '/tracker', dropdownOnly: true }]
			: []),
		{ name: 'Facilities', href: windowedHref('/facilities', windowed) },
		{ name: 'Scenarios', href: '/scenarios' },
		{ name: 'Records', href: '/records' },
		{ name: 'Analysis', href: '/analysis' },
		{ name: 'About', href: '/about' }
	];

	if (featureFlags.tracker2_nav) {
		items.splice(1, 0, { name: 'Tracker2', href: '/studio/explorer', beta: true });
	}

	return items;
}
