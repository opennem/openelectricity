/**
 * @typedef {Object} NavItem
 * @property {string} name
 * @property {string} href
 * @property {NavItem[]} [children]
 * @property {boolean} [show]
 * @property {boolean} [beta]
 */

/**
 * Build the main site nav items. `trackerLink` is resolved at call time so
 * the consumer controls when to read from the `dataTrackerLink` store.
 *
 * `featureFlags` gates experimental entries the same way the map options do —
 * e.g. `tracker2_nav` surfaces the new Explorer dashboard.
 *
 * @param {string} trackerLink
 * @param {Record<string, boolean>} [featureFlags]
 * @returns {NavItem[]}
 */
export function getNavItems(trackerLink, featureFlags = {}) {
	/** @type {NavItem[]} */
	const items = [
		{ name: 'Tracker', href: trackerLink },
		{ name: 'Facilities', href: '/facilities' },
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
