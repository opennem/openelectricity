import { parseTrackerUrl } from './tracker-url.js';

export function load({ url, route }) {
	// Each view is its own route under this layout. Reading the route makes a
	// view switch re-run this load, so the next view's session starts at the
	// current time rather than the first view's.
	void route.id;
	const nowMs = Date.now();
	return { ...parseTrackerUrl(url.searchParams, { nowMs }), nowMs };
}
