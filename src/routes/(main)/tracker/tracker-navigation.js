import { applyTrackerUrl, parseTrackerUrl } from './tracker-url.js';

/** One URL writer, also used to recognise our own shallow navigation updates.
 * @param {{read: () => URL, write: (url: URL, mode: 'push' | 'replace') => void}} browser
 */
export function createTrackerNavigation(browser) {
	let appliedSearch = browser.read().search;
	return {
		/** @param {import('./types.js').TrackerUrlState} state @param {'push' | 'replace'} mode */
		write(state, mode) {
			const current = browser.read();
			const next = applyTrackerUrl(new URL(current), state);
			appliedSearch = next.search;
			if (next.href !== current.href) browser.write(next, mode);
		},
		/** Back/Forward and same-route link navigation both arrive here.
		 * @param {URL} url @param {number} nowMs */
		read(url, nowMs) {
			if (url.search === appliedSearch) return null;
			appliedSearch = url.search;
			return parseTrackerUrl(url.searchParams, { nowMs });
		}
	};
}
