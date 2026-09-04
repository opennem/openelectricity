/**
 * URL (de)serialisation for the tracker page. Compact navigation state only —
 * scope, range and card modes. Ephemeral interaction state (hover, pan/zoom
 * engagement, panel width, hidden series, contribution mode) is deliberately
 * excluded from browser history.
 *
 * Schema (defaults omitted so the canonical URL stays clean):
 * - `region`    — tracker scope, default `_all` (NEM)
 * - `range` | `start`+`end`, `interval` — via the shared facility range params
 * - `group`     — fuel-tech grouping, default `simple` (Simplified)
 * - `filter`    — calendar-period filter id (`jan`…`dec`, `summer`…, `q1`…,
 *                 `h1`/`h2`) for the All range; omitted when All (unfiltered)
 * - `price`     — `mv` when the price card shows market value; never written
 *                 for the 'au' scope, where market value is forced, not chosen
 * - `emissions` — `volume` when the emissions card shows volume (intensity is the default)
 * - `overlay`   — comma-separated generation-chart overlays (demand,
 *                 renewables, curtailment-solar, curtailment-wind)
 * - `table`     — `0` when the fuel-tech panel is closed
 * - `fullscreen`— `false` opts out of the fullscreen chrome
 */

import {
	applyRangeParams,
	parseRangeParams
} from '$lib/components/charts/facility/range-params.js';
import {
	bucketFilterKindFor,
	isValidBucketFilter
} from '$lib/components/charts/v2/bucket-filter.js';
import { GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
import { TRACKER_OVERLAYS } from './tracker-overlays.js';
import { hasSpotPrice, TRACKER_REGION_VALUES } from './tracker-regions.js';
import {
	DEFAULT_GROUP,
	DEFAULT_RANGE_DAYS,
	DEFAULT_REGION,
	isAllTierRange,
	normaliseEmissionsMode,
	normaliseRange
} from './tracker-model.js';

/** @typedef {import('./types.js').TrackerOverlay} TrackerOverlay */
/** @typedef {import('./types.js').TrackerRange} TrackerRange */
/** @typedef {import('./types.js').TrackerUrlState} TrackerUrlState */

const GROUP_VALUES = GROUP_OPTIONS.map((option) => option.value);

/**
 * Keep supported overlays unique and in a stable URL order.
 * @param {unknown} value
 * @returns {TrackerOverlay[]}
 */
export function normaliseTrackerOverlays(value) {
	if (!Array.isArray(value)) return [];
	const requested = new Set(value.filter((item) => typeof item === 'string'));
	return TRACKER_OVERLAYS.filter((overlay) => requested.has(overlay));
}

/**
 * Validate a calendar filter against the current All-range interval.
 * @param {string | null | undefined} filter
 * @param {TrackerRange} range
 * @returns {string | null}
 */
export function validBucketFilterFor(filter, range) {
	if (!filter || !isAllTierRange(range)) return null;
	return isValidBucketFilter(bucketFilterKindFor(range.intervalId), filter) ? filter : null;
}

/**
 * @param {URLSearchParams} params
 * @param {{ nowMs: number }} context - `nowMs` anchors relative presets
 * @returns {TrackerUrlState}
 */
export function parseTrackerUrl(params, context) {
	const requestedRegion = params.get('region') || DEFAULT_REGION;
	const region = TRACKER_REGION_VALUES.includes(requestedRegion) ? requestedRegion : DEFAULT_REGION;
	const requestedGroup = params.get('group') || DEFAULT_GROUP;
	const group = GROUP_VALUES.includes(requestedGroup) ? requestedGroup : DEFAULT_GROUP;
	const range = normaliseRange(
		parseRangeParams(params, { nowMs: context.nowMs, includeRolling: true })
	);
	return {
		region,
		group,
		range,
		bucketFilter: validBucketFilterFor(params.get('filter'), range),
		priceMode: params.get('price') === 'mv' ? 'market_value' : 'price',
		emissionsMode: normaliseEmissionsMode(params.get('emissions')),
		overlays: normaliseTrackerOverlays((params.get('overlay') ?? '').split(',')),
		tablePanelOpen: params.get('table') !== '0',
		fullscreen: params.get('fullscreen') !== 'false'
	};
}

/**
 * Materialise navigation state into a URL (mutated and returned).
 * @param {URL} url
 * @param {Pick<TrackerUrlState, 'region' | 'group' | 'range' | 'bucketFilter' | 'priceMode' | 'emissionsMode' | 'overlays' | 'tablePanelOpen'>} state
 */
export function applyTrackerUrl(url, state) {
	const params = url.searchParams;

	if (state.region === DEFAULT_REGION) params.delete('region');
	else params.set('region', state.region);

	if (state.group === DEFAULT_GROUP) params.delete('group');
	else params.set('group', state.group);

	const range = normaliseRange(state.range);
	const bucketFilter = validBucketFilterFor(state.bucketFilter, range);
	if (bucketFilter) params.set('filter', bucketFilter);
	else params.delete('filter');

	applyRangeParams(params, {
		selectedRange: range.kind === 'preset' ? range.days : null,
		displayInterval: range.intervalId,
		viewStart: range.kind === 'custom' ? range.startMs : 0,
		viewEnd: range.kind === 'custom' ? range.endMs : 0,
		defaultRangeDays: DEFAULT_RANGE_DAYS
	});

	if (state.priceMode === 'market_value' && hasSpotPrice(state.region)) params.set('price', 'mv');
	else params.delete('price');

	if (state.emissionsMode === 'volume') params.set('emissions', 'volume');
	else params.delete('emissions');

	const overlays = normaliseTrackerOverlays(state.overlays);
	if (overlays.length) params.set('overlay', overlays.join(','));
	else params.delete('overlay');

	if (state.tablePanelOpen) params.delete('table');
	else params.set('table', '0');

	return url;
}

/** @param {URL} url @param {Parameters<typeof applyTrackerUrl>[1]} state */
export function copiedTrackerUrl(url, state) {
	return applyTrackerUrl(new URL(url.href), state);
}
