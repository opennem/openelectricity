/**
 * Headless fuel-tech market-value provider for the tracker's fuel-tech table.
 *
 * Fetches `market_value` grouped by fuel tech through a `ChartDataManager` —
 * exactly the processing arm of NetworkChart's market-value panel — so the
 * table's volume-weighted prices share the charts' gap-aware caching, request
 * dedupe and settle reconciliation, but render nothing. When the price chart
 * is showing market value it issues the identical request URL, so the shared
 * broker collapses the pair into one network fetch.
 *
 * Implements the range-control chart surface (`setViewport` /
 * `reconcileFetches`), so listing it in `createChartRangeControl`'s `charts()`
 * keeps its window in lockstep with the visible charts.
 *
 * Must be called during component init — it registers `$effect`s.
 */

import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
import { getFuelTechColour } from '$lib/components/charts/colours.js';
import { getGroup, loadGroupsFor } from './groups.js';
import { processNetworkData } from './process-network-data.js';

/**
 * @param {{
 *   region: () => string,
 *   group: () => string,
 *   interval: () => string,
 *   timeZone: () => string
 * }} opts - Getters so the provider reads live component state
 */
export function createNetworkFuelTechMarketValue(opts) {
	/** @type {ChartDataManager | null} */
	let manager = $state.raw(null);

	// Last window pushed by the range control — replayed after a manager swap so
	// a grain/region/grouping switch refetches without waiting for a gesture.
	// Plain fields: they only matter at call time, never drive reactivity.
	let lastStart = 0;
	let lastEnd = 0;

	// Swap the manager whenever the data-source identity changes. Mirrors the
	// market-pair provider — no stash; the completed-response LRU in
	// ChartDataManager absorbs quick flips.
	$effect(() => {
		const region = opts.region();
		const group = opts.group();
		const interval = opts.interval();
		const tz = opts.timeZone();
		const groupConfig = getGroup(group);

		const next = new ChartDataManager({
			cacheKey: `${region}:mv-table`,
			networkTimezone: tz,
			interval,
			metric: 'market_value',
			seriesKey: group,
			processResponse: (resp) =>
				processNetworkData(resp, {
					groupMap: groupConfig.fuelTechs,
					groupOrder: groupConfig.order,
					groupLabels: groupConfig.labels,
					loadsToInvert: loadGroupsFor(groupConfig),
					getColour: getFuelTechColour,
					metricFilter: 'market_value',
					networkTimezone: tz
				}),
			buildFetchUrl: (params) => {
				params.set('region', region);
				return `/api/network/data?${params.toString()}`;
			}
		});

		manager = next;
		if (lastStart && lastEnd) next.requestRange(lastStart, lastEnd, { immediate: true });

		// Cleanup runs before every re-run and on destroy, so the outgoing
		// manager is always retired exactly once.
		return () => next.dispose();
	});

	return {
		/**
		 * Range-control push — same surface as a chart ref. Debounced internally
		 * by the manager, so per-frame gesture pushes coalesce.
		 * @param {number} startMs @param {number} endMs
		 */
		setViewport(startMs, endMs) {
			lastStart = startMs;
			lastEnd = endMs;
			manager?.requestRange(startMs, endMs);
		},

		/** Settle: abort out-of-window work and fetch the remaining gaps now. */
		reconcileFetches() {
			if (!manager || !lastStart || !lastEnd) return;
			manager.reconcileWindow(lastStart, lastEnd);
		},

		/**
		 * Rows within [startMs, endMs] — reactive when read from a derived
		 * (reads the manager's `$state.raw` cache).
		 * @param {number} startMs @param {number} endMs
		 */
		getVisibleRows(startMs, endMs) {
			return manager?.getDataForRange(startMs, endMs) ?? [];
		},

		/** Fetching, or not yet loaded — drives the table's overlay veil. */
		get isPending() {
			return !manager || manager.isLoading || !manager.initialLoadComplete;
		}
	};
}
