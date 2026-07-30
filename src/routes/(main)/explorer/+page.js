/**
 * Explorer — map-only shell for the future unified Tracker.
 *
 * No data fetching yet — the load just validates the URL state and flags the
 * page as fullscreen so the root layout hides the global chrome at SSR (no
 * first-paint flash, same contract as /facilities). Map chrome params share
 * the /facilities vocabulary: `theme` (only serialised when not light) and
 * `transmission=false` (only serialised when off).
 */

import { regionOptions } from '$lib/regions.js';
import { MAP_THEMES } from '$lib/components/map/map-style.js';

const REGION_VALUES = regionOptions.map((r) => r.value);

/**
 * @param {Object} params
 * @param {URL} params.url
 */
export function load({ url }) {
	let region = url.searchParams.get('region') || '_all';
	if (!REGION_VALUES.includes(region)) region = '_all';

	let mapTheme = url.searchParams.get('theme') || 'light';
	if (!MAP_THEMES.includes(mapTheme)) mapTheme = 'light';

	return {
		region,
		mapTheme: /** @type {'light' | 'dark' | 'satellite'} */ (mapTheme),
		showTransmissionLines: url.searchParams.get('transmission') !== 'false',
		fullscreen: true
	};
}
