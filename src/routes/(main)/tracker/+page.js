/**
 * Tracker — map-first shell for the unified Tracker.
 *
 * No data fetching in the load — live flows/prices poll client-side and the
 * panel charts self-fetch; the load just validates the URL state and flags the
 * page as fullscreen so the root layout hides the global chrome at SSR (no
 * first-paint flash, same contract as /facilities). Map chrome params share
 * the /facilities vocabulary, but the Tracker defaults to the dark theme:
 * `theme` (only serialised when not dark), `transmission=true` (lines off by
 * default, only serialised when on), `flows=false` (only serialised when
 * off), `legend=true` (the key is off by default, only serialised when
 * shown), and `ic` (only when a corridor panel is open).
 */

import { regionOptions } from '$lib/regions.js';
import { DEFAULT_MINI_METRIC, MINI_METRIC_OPTIONS } from './map-minis.js';
import { MAP_THEMES } from '$lib/components/map/map-style.js';
import { icFromSlug } from '$lib/flows/region-geo.js';

const REGION_VALUES = regionOptions.map((r) => r.value);

/**
 * @param {Object} params
 * @param {URL} params.url
 */
export function load({ url }) {
	let region = url.searchParams.get('region') || '_all';
	if (!REGION_VALUES.includes(region)) region = '_all';

	let mapTheme = url.searchParams.get('theme') || 'dark';
	if (!MAP_THEMES.includes(mapTheme)) mapTheme = 'dark';

	// `?view=map` swaps the side panel for on-anchor mini charts; `?chart=`
	// picks their metric (generation is the omitted default).
	const view = url.searchParams.get('view') === 'map' ? 'map' : 'panel';
	const chartParam = url.searchParams.get('chart');
	const mapChart = /** @type {'power' | 'price' | 'emissions'} */ (
		MINI_METRIC_OPTIONS.some((o) => o.value === chartParam) ? chartParam : DEFAULT_MINI_METRIC
	);

	return {
		region,
		view: /** @type {'panel' | 'map'} */ (view),
		mapChart,
		mapTheme: /** @type {'light' | 'dark' | 'satellite'} */ (mapTheme),
		showTransmissionLines: url.searchParams.get('transmission') === 'true',
		showFlows: url.searchParams.get('flows') !== 'false',
		showLegend: url.searchParams.get('legend') === 'true',
		// `?ic=nsw1-qld1` deep-links a corridor panel; unknown slugs resolve null,
		// and corridors are NEM-only so a WEM deep link drops the corridor.
		interconnector: region === 'wem' ? null : icFromSlug(url.searchParams.get('ic')),
		fullscreen: true
	};
}
