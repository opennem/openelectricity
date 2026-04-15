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
 * @param {string} trackerLink
 * @returns {NavItem[]}
 */
export function getNavItems(trackerLink) {
	return [
		{ name: 'Tracker', href: trackerLink },
		{ name: 'Facilities', href: '/facilities' },
		{ name: 'Scenarios', href: '/scenarios' },
		{ name: 'Records', href: '/records' },
		{ name: 'Analysis', href: '/analysis' },
		{ name: 'About', href: '/about' }
	];
}
