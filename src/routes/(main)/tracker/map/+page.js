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

import { DEFAULT_MINI_METRIC, MINI_METRIC_OPTIONS } from '../map-minis.js';
import { DEFAULT_REGION, TRACKER_REGION_OPTIONS } from '../tracker-regions.js';
import { MAP_THEMES } from '$lib/components/map/map-style.js';
import { icFromSlug } from '$lib/flows/region-geo.js';

const REGION_VALUES = TRACKER_REGION_OPTIONS.map((r) => r.value);

/**
 * @param {Object} params
 * @param {URL} params.url
 */
export function load({ url }) {
	let region = url.searchParams.get('region') || DEFAULT_REGION;
	if (!REGION_VALUES.includes(region)) region = DEFAULT_REGION;

	let mapTheme = url.searchParams.get('theme') || 'dark';
	if (!MAP_THEMES.includes(mapTheme)) mapTheme = 'dark';

	// The map view (on-anchor mini charts) is the default; `?view=panel` opts
	// back into the side panel. `?chart=` picks the minis' metric (generation
	// is the omitted default). `viewExplicit` lets the page distinguish a
	// deliberate `?view=` from the default — below tablet an unqualified URL
	// falls back to the panel (the map view has no sheet on a phone frame).
	const viewParam = url.searchParams.get('view');
	const view = viewParam === 'panel' ? 'panel' : 'map';
	const chartParam = url.searchParams.get('chart');
	const mapChart = /** @type {'power' | 'price' | 'emissions'} */ (
		MINI_METRIC_OPTIONS.some((o) => o.value === chartParam) ? chartParam : DEFAULT_MINI_METRIC
	);

	return {
		nowMs: Date.now(),
		region,
		view: /** @type {'panel' | 'map'} */ (view),
		viewExplicit: viewParam !== null,
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
