import { TRACKER_REGION_OPTIONS } from './tracker-regions.js';
import { parseTrackerUrl } from './tracker-url.js';

export function load({ url }) {
	const nowMs = Date.now();
	return {
		...parseTrackerUrl(url.searchParams, {
			nowMs,
			validRegions: TRACKER_REGION_OPTIONS.map((region) => region.value)
		}),
		nowMs
	};
}
