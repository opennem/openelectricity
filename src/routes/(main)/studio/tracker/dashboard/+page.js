import { TRACKER_REGION_OPTIONS } from '../tracker-regions.js';
import { parseDashboardUrl } from './dashboard-url.js';

export function load({ url }) {
	const nowMs = Date.now();
	return {
		...parseDashboardUrl(url.searchParams, {
			nowMs,
			validRegions: TRACKER_REGION_OPTIONS.map((region) => region.value)
		}),
		nowMs
	};
}
