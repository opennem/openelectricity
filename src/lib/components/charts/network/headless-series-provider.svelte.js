/**
 * Headless series provider core — the fetch/cache lifecycle every tracker
 * provider shares. A provider drives a `ChartDataManager` exactly like a
 * visible NetworkChart (gap-aware caching, request dedupe, settle
 * reconciliation) but renders nothing; consumers read its rows from deriveds.
 *
 * The specialised providers (`network-market-data`, `network-series-provider`,
 * `network-fueltech-series`) only differ in what they fetch and how the
 * response is processed, so they hand that in as a reactive `spec` and reuse
 * everything else from here.
 *
 * Implements the range-control chart surface (`setViewport` /
 * `reconcileFetches`), so listing a provider in `createChartRangeControl`'s
 * `charts()` keeps its window in lockstep with the visible charts.
 *
 * Must be called during component init — it registers `$effect`s.
 */

import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
import { createVisibleAggregation } from '$lib/components/charts/v2/display-aggregation.js';
import {
	reconcileBufferedRange,
	requestBufferedRange
} from '$lib/components/charts/v2/fetch-window.js';

/**
 * What a provider fetches. Re-read whenever any reactive input changes, so a
 * new spec swaps in a fresh manager.
 * @typedef {Object} HeadlessSeriesSpec
 * @property {string} cacheScope - Cache namespace within the region (`${region}:${cacheScope}`)
 * @property {string} metric - Manager metric key; viewport requests only reach a manager fetching it
 * @property {string} seriesKey - Identity of the processed series set (e.g. the grouping)
 * @property {(response: any) => any} processResponse
 */

/**
 * @typedef {Object} DisplayRowOptions
 * @property {string} displayInterval
 * @property {string} ianaTimeZone
 * @property {'sum' | 'mean'} method
 * @property {string | null} [bucketFilter]
 */

/**
 * @typedef {Object} HeadlessSeriesProvider
 * @property {(startMs: number, endMs: number) => void} setViewport - Request
 *   the chart's buffered window so matching requests deduplicate
 * @property {() => void} reconcileFetches - Settle: abort out-of-window work
 *   and fetch the remaining gaps now
 * @property {(startMs: number, endMs: number) => any[]} getVisibleRows - Rows
 *   within [startMs, endMs] at the native grain — reactive when read from a
 *   derived (reads the manager's `$state.raw` cache)
 * @property {(startMs: number, endMs: number, opts: DisplayRowOptions) => any[]} getDisplayRows -
 *   Rows aggregated to the display interval — the grain the charts render, so
 *   overlays and summaries track the central Interval control
 * @property {boolean} isPending - Loading state; disabled providers are never pending
 */

/**
 * @param {{
 *   region: () => string,
 *   interval: () => string,
 *   timeZone: () => string,
 *   spec: () => HeadlessSeriesSpec | null,
 *   enabled?: () => boolean
 * }} opts - Reactive getters. A null spec or a disabled provider fetches
 *   nothing; the last viewport is replayed when a manager is (re)built.
 * @returns {HeadlessSeriesProvider}
 */
export function createHeadlessSeriesProvider(opts) {
	/** @type {ChartDataManager | null} */
	let manager = $state.raw(null);

	// Last window pushed by the range control — replayed after a manager swap so
	// a grain/region/grouping switch refetches without waiting for a gesture.
	// Plain fields: they only matter at call time, never drive reactivity.
	let lastStart = 0;
	let lastEnd = 0;

	// Memoised viewport slice + aggregation, shared with the charts' pipeline.
	const visibleAggregation = createVisibleAggregation();

	const isEnabled = () => !opts.enabled || opts.enabled();
	const currentMetric = () => opts.spec()?.metric ?? '';

	// Swap the manager whenever the data-source identity changes. Mirrors the
	// chart host's swap effect, minus the stash — the completed-response LRU in
	// ChartDataManager already absorbs quick flips for these small series.
	$effect(() => {
		// Track enabled so toggling disposes or rebuilds the manager.
		if (!isEnabled()) {
			manager = null;
			return;
		}
		const region = opts.region();
		const interval = opts.interval();
		const tz = opts.timeZone();
		const spec = opts.spec();
		if (!spec) {
			manager = null;
			return;
		}

		const next = new ChartDataManager({
			cacheKey: `${region}:${spec.cacheScope}`,
			networkTimezone: tz,
			interval,
			metric: spec.metric,
			seriesKey: spec.seriesKey,
			processResponse: spec.processResponse,
			buildFetchUrl: (params) => {
				params.set('region', region);
				return `/api/network/data?${params.toString()}`;
			}
		});

		manager = next;
		if (lastStart && lastEnd) {
			requestBufferedRange(next, lastStart, lastEnd, interval, spec.metric, { immediate: true });
		}

		// Cleanup runs before every re-run and on destroy, so the outgoing
		// manager is always retired exactly once.
		return () => next.dispose();
	});

	return {
		setViewport(startMs, endMs) {
			lastStart = startMs;
			lastEnd = endMs;
			requestBufferedRange(manager, startMs, endMs, opts.interval(), currentMetric());
		},

		reconcileFetches() {
			if (!manager || !lastStart || !lastEnd) return;
			reconcileBufferedRange(manager, lastStart, lastEnd, opts.interval(), currentMetric());
		},

		getVisibleRows(startMs, endMs) {
			return manager?.getDataForRange(startMs, endMs) ?? [];
		},

		getDisplayRows(startMs, endMs, { displayInterval, ianaTimeZone, method, bucketFilter }) {
			if (!manager?.processedCache) return [];
			return visibleAggregation(manager.processedCache, {
				viewStart: startMs,
				viewEnd: endMs,
				apiInterval: manager.interval,
				displayInterval,
				ianaTimeZone,
				method,
				bucketFilter
			});
		},

		get isPending() {
			if (!isEnabled()) return false;
			return !manager || manager.isLoading || !manager.initialLoadComplete;
		}
	};
}
