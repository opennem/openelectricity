/**
 * URL (de)serialisation for the tracker page. Compact navigation state only —
 * scope, range, card modes and analytical selections. Ephemeral state (hover, pan/zoom
 * engagement and panel width) is deliberately
 * excluded from browser history.
 *
 * The analysis view is the route (`/tracker/timeline`, `/tracker/profile`,
 * `/tracker/compare`), not a parameter.
 *
 * Schema (defaults omitted so the canonical URL stays clean):
 * - `profile-display` — `breakdown` for the Profile's per-series cards (default stacked)
 * - `profile-style` — `lines` (multi-line), `radial` (radial clock),
 *                 `ridgeline` or `heatmap` (radial heatmap) for the breakdown;
 *                 default percentile bands
 * - `profile-today` — `1` adds the current day's line to the breakdown charts
 * - `profile-interval` — `5m` for 5-minute Profile slots (default 30-minute)
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
 * - `compare-*` — Compare (`/tracker/compare`) controls, see
 *                 `region-comparison.js`: `compare-display=heatmap` for the
 *                 heatmap display, `compare-interval` (Timeline's All-range
 *                 interval ids), `compare-filter`
 *                 (a calendar period of the grain), `compare-regions` (short names: `nsw`,
 *                 `wem`, `nem`, `au`…), `compare-charts` (hyphenated names:
 *                 `renewables`, `solar-generation`, `price-real`…),
 *                 `compare-basis`, `compare-start`/`compare-end`, `compare-table`
 *
 * Lists are comma-separated and written with bare commas (`readableQuery`).
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
import {
	normaliseProfileDays,
	normaliseProfileDisplay,
	normaliseProfileEnd,
	normaliseProfileInterval,
	normaliseProfileStyle
} from './time-of-day.js';
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

/** Every analysis view and its route id (for `resolve()`); Timeline is the default. */
export const TRACKER_VIEWS = /** @type {const} */ ([
	{ value: 'timeline', label: 'Timeline', route: '/(main)/tracker/timeline' },
	{ value: 'profile', label: 'Profile', route: '/(main)/tracker/profile' },
	{ value: 'compare', label: 'Compare', route: '/(main)/tracker/compare' }
]);

/** @typedef {(typeof TRACKER_VIEWS)[number]['value']} TrackerView */

/** The view named by `value`, falling back to Timeline.
 * @param {unknown} value */
export function trackerView(value) {
	return TRACKER_VIEWS.find((view) => view.value === value) ?? TRACKER_VIEWS[0];
}

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
 * unknown regions/groups fall back to the defaults, hidden series must belong
 * to the selected grouping, and the calendar filter needs the All tier.
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
	return {
		region,
		group,
		regionComparison: normaliseRegionComparison(
			/** @type {Partial<import('./region-comparison.js').RegionComparisonSelection> | undefined} */ (
				value.regionComparison ?? undefined
			)
		),
		profileDisplay: normaliseProfileDisplay(value.profileDisplay),
		profileStyle: normaliseProfileStyle(value.profileStyle),
		profileInterval: normaliseProfileInterval(value.profileInterval),
		profileToday: value.profileToday === true || value.profileToday === '1',
		profileDays: normaliseProfileDays(value.profileDays),
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
	return normaliseTrackerState({
		region: params.get('region') || DEFAULT_REGION,
		group: params.get('group') || DEFAULT_GROUP,
		regionComparison: parseRegionComparison(params),
		profileDisplay: params.get('profile-display'),
		profileStyle: params.get('profile-style'),
		profileInterval: params.get('profile-interval'),
		profileToday: params.get('profile-today'),
		profileDays: params.get('profile-days'),
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
	set('profile-display', next.profileDisplay === 'breakdown' ? 'breakdown' : null);
	set('profile-style', next.profileStyle === 'bands' ? null : next.profileStyle);
	set('profile-interval', next.profileInterval === '5m' ? '5m' : null);
	set('profile-today', next.profileToday ? '1' : null);
	set('profile-days', next.profileDays === 7 ? null : String(next.profileDays));
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
	// Table columns are a localStorage preference now; drop the retired param.
	params.delete('columns');
	// The breakdown draws every technology, every day, with no spot price, and
	// Stacked shows its area and radial bars side by side; drop the retired
	// metric, view, series and stacked-style choices. The analysis view is the
	// route now, so `view` is retired too, and Compare never read the
	// renewables mode `compare-renewables` wrote.
	for (const retired of [
		'view',
		'compare-renewables',
		'profile-metric',
		'profile-view',
		'profile-series',
		'profile-stack'
	])
		params.delete(retired);

	url.search = readableQuery(params);
	return url;
}

/**
 * The query as written to the address bar. Form encoding escapes every comma,
 * but a comma is a legal query character, so lists (`hidden`, `overlay`,
 * `compare-regions`, `compare-charts`) read `nsw,qld,vic`, not `nsw%2Cqld%2Cvic`.
 * Parsing decodes both spellings alike.
 * @param {URLSearchParams} params
 */
function readableQuery(params) {
	return params.toString().replaceAll('%2C', ',');
}

/** @param {URL} url @param {Parameters<typeof applyTrackerUrl>[1]} state */
export function copiedTrackerUrl(url, state) {
	return applyTrackerUrl(new URL(url.href), state);
}
