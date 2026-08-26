/**
 * Headless market-series provider for the tracker's network metrics.
 *
 * Fetches the renewables-share input pair — `generation_renewable` +
 * `demand_gross` (or their `_energy` variants) — through a `ChartDataManager`
 * so it shares the charts' gap-aware caching, request dedupe and settle
 * reconciliation, but renders nothing. Both basis variants are mapped onto the
 * same series ids so downstream metric computes are basis-agnostic.
 *
 * Implements the range-control chart surface (`setViewport` /
 * `reconcileFetches`), so listing it in `createChartRangeControl`'s `charts()`
 * keeps its window in lockstep with the visible charts.
 *
 * Must be called during component init — it registers `$effect`s.
 */

import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
import {
	reconcileBufferedRange,
	requestBufferedRange
} from '$lib/components/charts/v2/fetch-window.js';
import { processMarketData } from './process-market-data.js';

/** Stable series ids shared with the metrics calc. */
export const RENEWABLES_SERIES_ID = 'renewables';
export const DEMAND_GROSS_SERIES_ID = 'demand_gross';

/**
 * One def per OE metric in the response — the energy basis is the same pair
 * with `_energy`-suffixed metric names. Colours are unused (nothing charts
 * these series) but the processor requires them.
 * @type {import('./process-market-data.js').MarketSeriesDef[]}
 */
const BASE_SERIES_DEFS = [
	{
		metric: 'generation_renewable',
		id: RENEWABLES_SERIES_ID,
		label: 'Renewables',
		colour: '#2D9B14'
	},
	{
		metric: 'demand_gross',
		id: DEMAND_GROSS_SERIES_ID,
		label: 'Gross demand',
		colour: '#6A6A6A'
	}
];

/** @param {'power' | 'energy'} basis */
const seriesDefsFor = (basis) =>
	BASE_SERIES_DEFS.map((def) =>
		basis === 'energy' ? { ...def, metric: `${def.metric}_energy` } : def
	);

/** @param {'power' | 'energy'} basis */
const metricKeyFor = (basis) => (basis === 'energy' ? 'renewables_energy' : 'renewables');

/**
 * @param {{
 *   region: () => string,
 *   basis: () => 'power' | 'energy',
 *   interval: () => string,
 *   timeZone: () => string,
 *   enabled?: () => boolean
 * }} opts - Reactive getters. A disabled provider fetches nothing and replays
 *   its last viewport when enabled.
 * @returns {{
 *   setViewport: (startMs: number, endMs: number) => void,
 *   reconcileFetches: () => void,
 *   getVisibleRows: (startMs: number, endMs: number) => any[],
 *   readonly isPending: boolean
 * }}
 */
export function createNetworkMarketData(opts) {
	/** @type {ChartDataManager | null} */
	let manager = $state.raw(null);

	// Last window pushed by the range control — replayed after a manager swap so
	// a grain/region switch refetches the pair without waiting for a gesture.
	// Plain fields: they only matter at call time, never drive reactivity.
	let lastStart = 0;
	let lastEnd = 0;

	// Swap the manager whenever the data-source identity changes. Mirrors the
	// chart host's swap effect, minus the stash — the completed-response LRU in
	// ChartDataManager already absorbs quick region flips for these tiny series.
	$effect(() => {
		// Track enabled so toggling disposes or rebuilds the manager.
		if (opts.enabled && !opts.enabled()) {
			manager = null;
			return;
		}
		const region = opts.region();
		const basis = opts.basis();
		const interval = opts.interval();
		const tz = opts.timeZone();
		const metricKey = metricKeyFor(basis);

		const next = new ChartDataManager({
			cacheKey: `${region}:metrics`,
			networkTimezone: tz,
			interval,
			metric: metricKey,
			seriesKey: 'renewables-pair',
			processResponse: (resp) =>
				processMarketData(resp, { seriesDefs: seriesDefsFor(basis), networkTimezone: tz }),
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
			requestBufferedRange(manager, startMs, endMs, interval, metricKeyFor(opts.basis()));
		},

		/** Settle: abort out-of-window work and fetch the remaining gaps now. */
		reconcileFetches() {
			if (!manager || !lastStart || !lastEnd) return;
			const interval = opts.interval();
			reconcileBufferedRange(manager, lastStart, lastEnd, interval, metricKeyFor(opts.basis()));
		},

		/**
		 * Rows within [startMs, endMs] — reactive when read from a derived
		 * (reads the manager's `$state.raw` cache).
		 * @param {number} startMs @param {number} endMs
		 */
		getVisibleRows(startMs, endMs) {
			return manager?.getDataForRange(startMs, endMs) ?? [];
		},

		/** Loading state; disabled providers are never pending. */
		get isPending() {
			if (opts.enabled && !opts.enabled()) return false;
			return !manager || manager.isLoading || !manager.initialLoadComplete;
		}
	};
}
