import { applyTrackerUrl, parseTrackerUrl } from './tracker-url.js';

/** One URL writer, also used to recognise our own shallow navigation updates.
 * It owns the path of the URL the page loaded (one view's route): writes
 * change only that path's query, and other routes' URLs belong to their own
 * pages.
 * @param {{read: () => URL, write: (url: URL, mode: 'push' | 'replace') => void}} browser
 * @param {URL} [loaded] - The URL the page's state was seeded from (default: the address bar)
 */
export function createTrackerNavigation(browser, loaded = browser.read()) {
	const { pathname } = loaded;
	let appliedSearch = loaded.search;
	return {
		/** @param {import('./types.js').TrackerUrlState} state @param {'push' | 'replace'} mode */
		write(state, mode) {
			const url = browser.read();
			if (url.pathname !== pathname) return;
			const current = url.search;
			appliedSearch = applyTrackerUrl(url, state).search;
			if (appliedSearch !== current) browser.write(url, mode);
		},
		/** Back/Forward and same-route links arrive here; null when there is
		 * nothing to restore (our own write, or another route's URL).
		 * @param {URL} url @param {number} nowMs */
		read(url, nowMs) {
			if (url.pathname !== pathname || url.search === appliedSearch) return null;
			appliedSearch = url.search;
			return parseTrackerUrl(url.searchParams, { nowMs });
		}
	};
}
