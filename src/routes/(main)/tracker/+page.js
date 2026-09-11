import { parseTrackerUrl } from './tracker-url.js';

export function load({ url, data }) {
	const nowMs = Date.now();
	return { ...data, ...parseTrackerUrl(url.searchParams, { nowMs }), nowMs };
}
