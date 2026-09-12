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
import {
	applyRegionComparison,
	normaliseRegionComparison,
	parseRegionComparison
} from './region-comparison.js';
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
 * Every invariant the navigation state must satisfy, applied in one place so
 * parsing a URL, serialising one and the per-page session cannot disagree:
 * unknown regions/groups fall back to the defaults, hidden series and the
 * profile series must belong to the selected grouping, the profile metric
 * needs a spot price, and the calendar filter needs the All tier.
 * @param {{ [K in keyof TrackerUrlState]?: unknown }} value
 * @returns {TrackerUrlState}
 */
export function normaliseTrackerState(value) {
	const region =
		typeof value.region === 'string' && TRACKER_REGION_VALUES.includes(value.region)
			? value.region
			: DEFAULT_REGION;
	const group =
		typeof value.group === 'string' && GROUP_VALUES.includes(value.group)
			? value.group
			: DEFAULT_GROUP;
	const range = normaliseRange(value.range);
	const profileSeries = typeof value.profileSeries === 'string' ? value.profileSeries : '';
	return {
		region,
		group,
		compareRegions: !!value.compareRegions,
		regionComparison: normaliseRegionComparison(
			/** @type {Partial<import('./region-comparison.js').RegionComparisonSelection> | undefined} */ (
				value.regionComparison ?? undefined
			)
		),
		profileView: normaliseProfileView(value.profileView),
		profileDays: normaliseProfileDays(value.profileDays),
		profileMetric: value.profileMetric === 'price' && hasSpotPrice(region) ? 'price' : 'power',
		profileSeries: getGroup(group).order.includes(profileSeries) ? profileSeries : '',
		profileEnd: normaliseProfileEnd(value.profileEnd),
		comparison: normaliseComparison(value.comparison),
		hiddenSeries: normaliseHiddenSeries(value.hiddenSeries, group),
		contributionMode: normaliseContributionMode(value.contributionMode),
		generationTransform: normaliseDataTransform(value.generationTransform),
		marketValueTransform: normaliseDataTransform(value.marketValueTransform),
		range,
		bucketFilter: validBucketFilterFor(
			typeof value.bucketFilter === 'string' ? value.bucketFilter : null,
			range
		),
		priceMode: value.priceMode === 'market_value' ? 'market_value' : 'price',
		emissionsMode: normaliseEmissionsMode(value.emissionsMode),
		overlays: normaliseTrackerOverlays(value.overlays),
		tablePanelOpen: value.tablePanelOpen !== false,
		fullscreen: value.fullscreen !== false
	};
}

/**
 * @param {URLSearchParams} params
 * @param {{ nowMs: number }} context - `nowMs` anchors relative presets
 * @returns {TrackerUrlState}
 */
export function parseTrackerUrl(params, context) {
	const compareRegions = params.get('view') === 'regions';
	return normaliseTrackerState({
		region: params.get('region') || DEFAULT_REGION,
		group: params.get('group') || DEFAULT_GROUP,
		compareRegions,
		regionComparison: parseRegionComparison(params),
		// Legacy `profile-view` links stay readable while comparing regions.
		profileView: compareRegions ? params.get('profile-view') : params.get('view'),
		profileDays: params.get('profile-days'),
		profileMetric: params.get('profile-metric'),
		profileSeries: params.get('profile-series') ?? '',
		profileEnd: params.get('profile-end'),
		comparison:
			params.get('compare') === '1'
				? { a: params.get('compare-a'), b: params.get('compare-b') }
				: null,
		hiddenSeries: (params.get('hidden') ?? '').split(','),
		contributionMode: params.get('contribution'),
		generationTransform: params.get('transform'),
		marketValueTransform: params.get('market-transform'),
		range: parseRangeParams(params, { nowMs: context.nowMs, includeRolling: true }),
		bucketFilter: params.get('filter'),
		priceMode: params.get('price') === 'mv' ? 'market_value' : 'price',
		emissionsMode: params.get('emissions'),
		overlays: (params.get('overlay') ?? '').split(','),
		tablePanelOpen: params.get('table') !== '0',
		fullscreen: params.get('fullscreen') !== 'false'
	});
}

/**
 * Materialise navigation state into a URL (mutated and returned). Defaults
 * are deleted rather than written so the canonical URL stays clean.
 * @param {URL} url
 * @param {Omit<TrackerUrlState, 'fullscreen'>} state
 */
export function applyTrackerUrl(url, state) {
	const params = url.searchParams;
	const next = normaliseTrackerState(state);
	applyRegionComparison(params, next.regionComparison);
	/** @param {string} key @param {string | null} value */
	const set = (key, value) => (value ? params.set(key, value) : params.delete(key));

	set('compare', next.comparison ? '1' : null);
	for (const side of /** @type {const} */ (['a', 'b'])) {
		const time = next.comparison?.[side];
		set(`compare-${side}`, time == null ? null : String(time));
	}
	set(
		'view',
		next.compareRegions ? 'regions' : next.profileView === 'timeline' ? null : next.profileView
	);
	set(
		'profile-view',
		next.compareRegions && next.profileView !== 'timeline' ? next.profileView : null
	);
	set('profile-days', next.profileDays === 7 ? null : String(next.profileDays));
	set('profile-metric', next.profileMetric === 'price' ? 'price' : null);
	set('profile-series', next.profileSeries || null);
	set('profile-end', next.profileEnd || null);
	set('region', next.region === DEFAULT_REGION ? null : next.region);
	set('group', next.group === DEFAULT_GROUP ? null : next.group);
	set('hidden', next.hiddenSeries.length ? next.hiddenSeries.join(',') : null);
	set('contribution', next.contributionMode === 'generation' ? 'generation' : null);
	set('transform', next.generationTransform === 'absolute' ? null : next.generationTransform);
	set(
		'market-transform',
		next.marketValueTransform === 'absolute' ? null : next.marketValueTransform
	);
	set('filter', next.bucketFilter);
	applyRangeParams(params, {
		selectedRange: next.range.kind === 'preset' ? next.range.days : null,
		displayInterval: next.range.intervalId,
		viewStart: next.range.kind === 'custom' ? next.range.startMs : 0,
		viewEnd: next.range.kind === 'custom' ? next.range.endMs : 0,
		defaultRangeDays: DEFAULT_RANGE_DAYS
	});
	// Market value is forced, not chosen, where there is no spot price.
	set('price', next.priceMode === 'market_value' && hasSpotPrice(next.region) ? 'mv' : null);
	set('emissions', next.emissionsMode === 'volume' ? 'volume' : null);
	set('overlay', next.overlays.length ? next.overlays.join(',') : null);
	set('table', next.tablePanelOpen ? null : '0');

	return url;
}

/** @param {URL} url @param {Parameters<typeof applyTrackerUrl>[1]} state */
export function copiedTrackerUrl(url, state) {
	return applyTrackerUrl(new URL(url.href), state);
}
