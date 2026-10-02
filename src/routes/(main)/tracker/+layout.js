import { parseTrackerUrl } from './tracker-url.js';

export function load({ url }) {
	const nowMs = Date.now();
	return { ...parseTrackerUrl(url.searchParams, { nowMs }), nowMs };
}
