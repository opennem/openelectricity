import { API_STATUS_TTL_MS, fetchApiStatus } from './api-status.js';

/**
 * A page's live API status: `current` is the latest summary, undefined until
 * the first check answers and null when the last one failed. `start()` checks
 * now and again each time the shared answer expires, until the function it
 * returns stops it; `refresh()` checks once more (answered from the shared
 * cache while it is fresh). A slower, older check never overwrites a newer
 * one.
 *
 * @returns {{
 *   readonly current: import('./api-status.js').ApiStatusSummary | null | undefined,
 *   refresh: () => void,
 *   start: () => () => void
 * }}
 */
export function createApiStatusState() {
	/** @type {import('./api-status.js').ApiStatusSummary | null | undefined} */
	let current = $state();
	let latest = 0;

	function refresh() {
		const request = ++latest;
		fetchApiStatus().then((summary) => {
			if (request === latest) current = summary;
		});
	}

	return {
		get current() {
			return current;
		},
		refresh,
		start() {
			refresh();
			const timer = setInterval(refresh, API_STATUS_TTL_MS);
			return () => clearInterval(timer);
		}
	};
}
