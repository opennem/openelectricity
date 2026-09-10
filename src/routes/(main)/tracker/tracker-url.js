/**
 * URL (de)serialisation for the tracker page. Compact navigation state only —
 * scope, range, card modes and analytical selections. Ephemeral state (hover, pan/zoom
 * engagement and panel width) is deliberately
 * excluded from browser history.
 *
 * Schema (defaults omitted so the canonical URL stays clean):
 * - `region`    — tracker scope, default `_all` (NEM)
 * - `range` | `start`+`end`, `interval` — via the shared facility range params
 * - `group`     — fuel-tech grouping, default `simple` (Simplified)
 * - `hidden`    — comma-separated hidden IDs in the selected grouping
 * - `contribution` — `generation` for source generation, otherwise gross demand
 * - `transform` / `market-transform` — generation / market-value data transform;
 *                 `proportion` or `changeSince`, default `absolute`
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
import { GROUP_OPTIONS, getGroup } from '$lib/components/charts/network/groups.js';
import { TRACKER_OVERLAYS } from './tracker-overlays.js';
import { normaliseProfileView, normaliseProfileDays, normaliseProfileEnd } from './time-of-day.js';
import { hasSpotPrice, TRACKER_REGION_VALUES } from './tracker-regions.js';
import { normaliseComparison } from './comparison.js';
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

/** @param {unknown} value @param {string} group @returns {string[]} */
export function normaliseHiddenSeries(value, group) {
	if (!Array.isArray(value)) return [];
	const requested = new Set(value.filter((id) => typeof id === 'string').map((id) => id.trim()));
	return getGroup(group).order.filter((id) => requested.has(id));
}

/** @param {unknown} value @returns {import('./types.js').ContributionMode} */
export function normaliseContributionMode(value) {
	return value === 'generation' ? 'generation' : 'demand';
}

/** @param {unknown} value @returns {import('$lib/components/charts/v2/ChartOptions.svelte.js').DataTransformType} */
export function normaliseDataTransform(value) {
	return value === 'proportion' || value === 'changeSince' ? value : 'absolute';
}

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
		profileView: normaliseProfileView(params.get('view')),
		profileDays: normaliseProfileDays(params.get('profile-days')),
		profileMetric:
			params.get('profile-metric') === 'price' && hasSpotPrice(region) ? 'price' : 'power',
		profileSeries: getGroup(group).order.includes(params.get('profile-series') ?? '')
			? (params.get('profile-series') ?? '')
			: '',
		profileEnd: normaliseProfileEnd(params.get('profile-end')),
		comparison:
			params.get('compare') === '1'
				? normaliseComparison({ a: params.get('compare-a'), b: params.get('compare-b') })
				: null,
		hiddenSeries: normaliseHiddenSeries((params.get('hidden') ?? '').split(','), group),
		contributionMode: normaliseContributionMode(params.get('contribution')),
		generationTransform: normaliseDataTransform(params.get('transform')),
		marketValueTransform: normaliseDataTransform(params.get('market-transform')),
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
 * @param {Omit<TrackerUrlState, 'fullscreen'>} state
 */
export function applyTrackerUrl(url, state) {
	const params = url.searchParams;
	const comparison = normaliseComparison(state.comparison);
	if (comparison) params.set('compare', '1');
	else params.delete('compare');
	for (const side of /** @type {const} */ (['a', 'b'])) {
		const time = comparison?.[side];
		if (time != null) params.set(`compare-${side}`, String(time));
		else params.delete(`compare-${side}`);
	}
	const profileParams = {
		view: normaliseProfileView(state.profileView) === 'timeline' ? '' : state.profileView,
		'profile-days': normaliseProfileDays(state.profileDays) === 7 ? '' : String(state.profileDays),
		'profile-metric': state.profileMetric === 'price' && hasSpotPrice(state.region) ? 'price' : '',
		'profile-series': getGroup(state.group).order.includes(state.profileSeries)
			? state.profileSeries
			: '',
		'profile-end': normaliseProfileEnd(state.profileEnd)
	};
	for (const [key, value] of Object.entries(profileParams)) {
		if (value) params.set(key, value);
		else params.delete(key);
	}

	if (state.region === DEFAULT_REGION) params.delete('region');
	else params.set('region', state.region);

	if (state.group === DEFAULT_GROUP) params.delete('group');
	else params.set('group', state.group);

	const hidden = normaliseHiddenSeries(state.hiddenSeries, state.group);
	if (hidden.length) params.set('hidden', hidden.join(','));
	else params.delete('hidden');

	if (normaliseContributionMode(state.contributionMode) === 'generation')
		params.set('contribution', 'generation');
	else params.delete('contribution');

	for (const [key, value] of [
		['transform', state.generationTransform],
		['market-transform', state.marketValueTransform]
	]) {
		const transform = normaliseDataTransform(value);
		if (transform === 'absolute') params.delete(key);
		else params.set(key, transform);
	}

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
