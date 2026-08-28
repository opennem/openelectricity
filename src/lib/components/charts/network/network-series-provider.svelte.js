/**
 * Generic headless market-series provider — fetches any configured market
 * metric (demand, curtailment, renewable share…) through a `ChartDataManager`
 * so consumers share the charts' gap-aware caching, request dedupe and settle
 * reconciliation without rendering a chart.
 *
 * The metric key resolves through `getMarketMetricConfig`, so the processed
 * series carry the same ids/labels/colours as a visible NetworkChart for the
 * same metric would.
 *
 * Implements the range-control chart surface (`setViewport` /
 * `reconcileFetches`) — list it in `createChartRangeControl`'s `charts()` to
 * keep its window in lockstep with the visible charts.
 *
 * Must be called during component init — it registers `$effect`s.
 */

import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
import { createVisibleAggregation } from '$lib/components/charts/v2/display-aggregation.js';
import {
	reconcileBufferedRange,
	requestBufferedRange
} from '$lib/components/charts/v2/fetch-window.js';
import { getMarketMetricConfig } from './market-metrics.js';
import { processMarketData } from './process-market-data.js';

/**
 * @param {{
 *   region: () => string,
 *   metricKey: () => string,
 *   interval: () => string,
 *   timeZone: () => string,
 *   enabled?: () => boolean
 * }} opts - Reactive getters. A disabled provider fetches nothing and replays
 *   its last viewport when enabled.
 */
export function createMarketSeriesProvider(opts) {
	/** @type {ChartDataManager | null} */
	let manager = $state.raw(null);

	// Last window pushed by the range control — replayed after a manager swap.
	// Plain fields: they only matter at call time, never drive reactivity.
	let lastStart = 0;
	let lastEnd = 0;

	// Memoised viewport slice + aggregation, shared with the charts' pipeline.
	const visibleAggregation = createVisibleAggregation();

	$effect(() => {
		// Track enabled so toggling disposes or rebuilds the manager.
		if (opts.enabled && !opts.enabled()) {
			manager = null;
			return;
		}
		const region = opts.region();
		const metricKey = opts.metricKey();
		const interval = opts.interval();
		const tz = opts.timeZone();
		const config = getMarketMetricConfig(metricKey);
		if (!config) {
			manager = null;
			return;
		}

		const next = new ChartDataManager({
			cacheKey: `${region}:${metricKey}-provider`,
			networkTimezone: tz,
			interval,
			metric: metricKey,
			seriesKey: metricKey,
			processResponse: (resp) =>
				processMarketData(resp, { seriesDefs: config.seriesDefs, networkTimezone: tz }),
			buildFetchUrl: (params) => {
				params.set('region', region);
				return `/api/network/data?${params.toString()}`;
			}
		});

		manager = next;
		if (lastStart && lastEnd) {
			requestBufferedRange(next, lastStart, lastEnd, interval, metricKey, { immediate: true });
		}

		// Cleanup runs before every re-run and on destroy, so the outgoing
		// manager is always retired exactly once.
		return () => next.dispose();
	});

	return {
		/**
		 * Request the chart's buffered window so matching requests deduplicate.
		 * @param {number} startMs @param {number} endMs
		 */
		setViewport(startMs, endMs) {
			lastStart = startMs;
			lastEnd = endMs;
			const interval = opts.interval();
			requestBufferedRange(manager, startMs, endMs, interval, opts.metricKey());
		},

		/** Settle: abort out-of-window work and fetch the remaining gaps now. */
		reconcileFetches() {
			if (!manager || !lastStart || !lastEnd) return;
			const interval = opts.interval();
			reconcileBufferedRange(manager, lastStart, lastEnd, interval, opts.metricKey());
		},

		/**
		 * Rows within [startMs, endMs] — reactive when read from a derived.
		 * @param {number} startMs @param {number} endMs
		 */
		getVisibleRows(startMs, endMs) {
			return manager?.getDataForRange(startMs, endMs) ?? [];
		},

		/**
		 * Rows aggregated to the display interval — the same grain the charts
		 * render, so overlays and table values track the central Interval
		 * control rather than the native fetch grain.
		 * @param {number} startMs @param {number} endMs
		 * @param {{ displayInterval: string, ianaTimeZone: string, method: 'sum' | 'mean', bucketFilter?: string | null }} opts
		 */
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

		/** Loading state; disabled providers are never pending. */
		get isPending() {
			if (opts.enabled && !opts.enabled()) return false;
			return !manager || manager.isLoading || !manager.initialLoadComplete;
		}
	};
}
