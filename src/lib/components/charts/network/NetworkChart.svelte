<script>
	/**
	 * NetworkChart — reusable network-level visualisation for the Explorer.
	 *
	 * Network analogue of `FacilityChart`: drives a `ChartStore` + `ChartDataManager`
	 * through `StratumChart`, reusing the same pan/zoom, gap-aware caching and
	 * display-aggregation pipeline. Data comes from `/api/network/data` instead of
	 * the facility endpoint, and series are fuel-tech groups (Generation) or a
	 * single spot-price line (Price).
	 */

	import { untrack } from 'svelte';
	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { createVisibleAggregation } from '$lib/components/charts/v2/display-aggregation.js';
	import { formatXAxis, applyFacilityTimeAxis } from '$lib/components/charts/v2/formatters.js';
	import {
		getIntervalSpec,
		viewportDurationLimits
	} from '$lib/components/charts/facility/range-interval-config.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { createManagerStash, managerKey } from '$lib/components/charts/v2/manager-stash.js';
	import { showLoadingOverlay as computeShowLoadingOverlay } from '$lib/components/charts/v2/chart-loading-state.js';
	import {
		createViewportGestures,
		isViewportPinned
	} from '$lib/components/charts/v2/viewport-gestures.js';
	import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
	import { processNetworkData } from './process-network-data.js';
	import { processPriceData } from '$lib/components/charts/facility/process-price-data.js';
	import { getGroup } from './groups.js';
	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { loadFuelTechs } from '$lib/fuel_techs';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { ianaFromOffset } from '../v2/network-time.js';
	import { perfSpan } from '../v2/perf.js';

	/**
	 * @typedef {Object} Props
	 * @property {string} region - Explorer region value ('_all', 'nsw1'…, 'wem')
	 * @property {'power' | 'energy' | 'price'} [metric] - API metric
	 * @property {string} [interval] - Native OE interval (5m, 1h, 1d, 1M…)
	 * @property {string} [displayInterval] - Display interval for aggregation
	 * @property {string} [group] - Fuel-tech grouping value (Generation only)
	 * @property {'stacked' | 'line'} [chartKind] - Stacked area (generation) or line (price)
	 * @property {string} [timeZone] - Network offset string ('+10:00' / '+08:00')
	 * @property {string} [dateStart] - Initial viewport start (YYYY-MM-DD)
	 * @property {string} [dateEnd] - Initial viewport end (YYYY-MM-DD)
	 * @property {string} [title] - Chart header title
	 * @property {string} [chartHeight] - Height class
	 * @property {number} [chartHeightPx] - Height in px (overrides chartHeight)
	 * @property {boolean} [showContainer] - Wrap in bordered/padded container
	 * @property {boolean} [showHeader] - Show the chart header bar
	 * @property {'strip' | 'floating' | 'none'} [tooltipMode]
	 * @property {boolean} [useDivergingStack] - Stack positive/negative independently
	 * @property {number | undefined} [hoverTime] - External hover time for cross-chart sync
	 * @property {((time: number | undefined) => void)} [onhoverchange]
	 * @property {((range: {start: number, end: number}) => void)} [onviewportchange]
	 * @property {((range: {start: number, end: number}) => void)} [onviewportsettle] - Fired once
	 *   when a pan/zoom gesture comes to rest — parents apply grain switches here
	 * @property {((tableData: {data: any[], seriesNames: string[], seriesLabels: Record<string, string>}) => void)} [onvisibledata]
	 * @property {'always' | 'tap-to-engage'} [panZoomMode]
	 * @property {boolean} [panZoomEngaged]
	 * @property {number} [minDateMs] - Viewport left-edge floor (default: EARLIEST_DATA_MS)
	 */

	/** @type {Props} */
	let {
		region,
		metric = 'power',
		interval = '5m',
		displayInterval = '30m',
		group = 'detailed',
		chartKind = 'stacked',
		timeZone = '+10:00',
		dateStart = '',
		dateEnd = '',
		title = '',
		chartHeight = 'h-[300px]',
		chartHeightPx = 0,
		showContainer = true,
		showHeader = true,
		tooltipMode = /** @type {'strip' | 'floating' | 'none'} */ ('floating'),
		useDivergingStack = false,
		hoverTime = undefined,
		onhoverchange,
		onviewportchange,
		onviewportsettle,
		onvisibledata,
		panZoomMode = /** @type {'always' | 'tap-to-engage'} */ ('always'),
		panZoomEngaged = $bindable(false),
		minDateMs = EARLIEST_DATA_MS
	} = $props();

	const dollarFormatter = getNumberFormat(0);

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let isPriceKind = $derived(chartKind === 'line');
	let isEnergyMetric = $derived(metric === 'energy');

	/** Fine grain (sub-daily) drives the power-style viewport limits. */
	let fineGrain = $derived(interval === '5m' || interval === '1h');

	let MIN_VIEWPORT_MS = $derived(viewportDurationLimits(fineGrain).minMs);
	let MAX_VIEWPORT_MS = $derived(viewportDurationLimits(fineGrain).maxMs);
	let fetchBufferMultiplier = $derived(fineGrain ? 1 : 3);

	// ============================================
	// Viewport state
	// ============================================

	/** @type {number} */
	let viewStart = $state(0);
	/** @type {number} */
	let viewEnd = $state(0);
	let isPanning = $state(false);

	// ============================================
	// Series processing config
	// ============================================

	let groupConfig = $derived(getGroup(group));

	/**
	 * Process function for the active panel — fuel-tech-grouped generation or a
	 * single price line. Captured into the data manager so it runs on every fetch.
	 */
	let processResponseFn = $derived.by(() => {
		const tz = timeZone || '+10:00';
		if (isPriceKind) {
			return (/** @type {any} */ resp) =>
				processPriceData(resp, { metricFilter: 'price', networkTimezone: tz });
		}
		const cfg = {
			groupMap: groupConfig.fuelTechs,
			groupOrder: groupConfig.order,
			groupLabels: groupConfig.labels,
			loadsToInvert: loadFuelTechs,
			getColour: getFuelTechColour,
			metricFilter: metric,
			networkTimezone: tz
		};
		return (/** @type {any} */ resp) => processNetworkData(resp, cfg);
	});

	/**
	 * Build the network fetch URL — ChartDataManager passes its standard params
	 * (interval, metric, date_start, date_end); we add the region and route to
	 * `/api/network/data`.
	 * @param {URLSearchParams} params
	 */
	let buildFetchUrl = $derived.by(() => {
		const currentRegion = region;
		return (/** @type {URLSearchParams} */ params) => {
			params.set('region', currentRegion);
			return `/api/network/data?${params.toString()}`;
		};
	});

	// ============================================
	// Data manager
	// ============================================

	/** @type {ChartDataManager | null} */
	let dataManager = $state(null);

	/**
	 * Warm managers stashed on swap (keyed by grain + series identity via
	 * managerKey, within the current region+kind) so filter round-trips — a grouping
	 * toggle-back, a hysteresis metric flip on zoom — revive cached data
	 * instantly instead of refetching.
	 */
	const managerStash = createManagerStash();

	/** Region the stash belongs to — a region change invalidates every entry. */
	let stashRegion = '';

	/**
	 * Stash the outgoing manager for an instant back-switch, or retire it when
	 * it belongs to another region/kind.
	 * @param {ChartDataManager | null | undefined} manager
	 * @param {string} currentCacheKey
	 */
	function stashOrDispose(manager, currentCacheKey) {
		if (!manager) return;
		// Dispose first — aborts the outgoing grain's in-flight fetches (refcounted
		// in sharedFetch, so shared URLs survive) while keeping the cache warm.
		manager.dispose();
		if (manager.cacheKey !== currentCacheKey) return;
		managerStash.stash(managerKey(manager.interval, manager.metric, manager.seriesKey), manager);
	}

	$effect(() => {
		// Dependencies that require a fresh manager
		const currentRegion = region;
		const currentMetric = metric;
		const currentInterval = interval;
		const currentKind = chartKind;
		// The processed series set is group-dependent for generation panels.
		const currentSeriesKey = isPriceKind ? '' : group;
		// `processResponseFn` already depends on `group` (via groupConfig), so a
		// group change recomputes it and re-runs this effect with a fresh manager.
		const processFn = processResponseFn;
		const urlFn = buildFetchUrl;

		const currentCacheKey = `${currentRegion}:${currentKind}`;

		// A region change means a different data source — drop the warm managers.
		if (stashRegion !== currentRegion) {
			if (stashRegion) managerStash.clear();
			stashRegion = currentRegion;
		}

		// Skip recreation when the live manager already matches — unrelated
		// dependency churn must not refetch.
		const existing = untrack(() => dataManager);
		if (
			existing &&
			existing.cacheKey === currentCacheKey &&
			existing.interval === currentInterval &&
			existing.metric === currentMetric &&
			existing.seriesKey === currentSeriesKey
		) {
			return;
		}

		// Revive a warm manager when one matches; otherwise construct fresh.
		const revived = managerStash.take(managerKey(currentInterval, currentMetric, currentSeriesKey));
		const manager =
			revived ??
			new ChartDataManager({
				cacheKey: currentCacheKey,
				networkTimezone: timeZone || '+10:00',
				interval: currentInterval,
				metric: currentMetric,
				seriesKey: currentSeriesKey,
				processResponse: processFn,
				buildFetchUrl: urlFn
			});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);

		if (!start && !end) {
			if (dateStart && dateEnd) {
				const tz = timeZone || '+10:00';
				viewStart = new Date(dateStart + 'T00:00:00' + tz).getTime();
				viewEnd = Math.min(new Date(dateEnd + 'T23:59:59' + tz).getTime(), Date.now());
			}
		}

		const vs = untrack(() => viewStart);
		const ve = untrack(() => viewEnd);
		if (vs && ve) {
			const duration = ve - vs;
			const buffer = duration * (currentMetric === 'energy' || !fineGrain ? 3 : 1);
			// A revived manager that still covers the window returns immediately
			// from its cache — no fetch, no loading flash.
			manager.requestRange(vs - buffer, Math.min(ve + buffer, Date.now()), { immediate: true });
		}

		// Keep the outgoing manager's cache warm for an instant back-switch.
		stashOrDispose(existing, currentCacheKey);
		dataManager = manager;
	});

	// Retire all managers on unmount so in-flight fetches settle as no-ops.
	$effect(() => {
		return () => {
			untrack(() => dataManager)?.dispose();
			managerStash.clear();
			disposeGestures();
		};
	});

	// ============================================
	// Chart store
	// ============================================

	/** @type {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} */
	let chartStore = $derived.by(() => {
		// Recreated when the panel kind flips (isPriceKind tracks chartKind).
		if (isPriceKind) {
			const chart = new ChartStore({
				key: Symbol('network-price'),
				title: title || 'Price',
				prefix: '',
				displayPrefix: '',
				baseUnit: '$/MWh',
				chartType: 'line',
				timeZone
			});
			chart.chartStyles.chartHeightClasses = chartHeight;
			if (chartHeightPx) chart.chartStyles.chartHeightPx = chartHeightPx;
			chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
			chart.chartStyles.snapTicks = true;
			chart.hideDataOptions = true;
			chart.hideChartTypeOptions = true;
			chart.chartTooltips.showTotal = false;
			chart.useFormatY = true;
			chart.formatY = (/** @type {number} */ d) => '$' + dollarFormatter.format(d);
			return chart;
		}

		const chart = new ChartStore({
			key: Symbol('network-generation'),
			title: title || 'Generation',
			prefix: 'M',
			displayPrefix: 'M',
			baseUnit: 'W',
			timeZone
		});
		chart.chartStyles.chartHeightClasses = chartHeight;
		if (chartHeightPx) chart.chartStyles.chartHeightPx = chartHeightPx;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.chartStyles.snapTicks = true;
		chart.useDivergingStack = useDivergingStack;
		chart.formatTickX = (/** @type {any} */ d) => formatXAxis(d, ianaTimeZone);
		return chart;
	});

	// Keep height in sync on panel resize
	$effect(() => {
		if (chartStore && chartHeightPx) chartStore.chartStyles.chartHeightPx = chartHeightPx;
	});

	// Title sync
	$effect(() => {
		if (chartStore) chartStore.title = title || (isPriceKind ? 'Price' : 'Generation');
	});

	// Series metadata
	$effect(() => {
		if (!chartStore || !dataManager?.processedCache) return;
		const processed = dataManager.processedCache;
		chartStore.seriesNames = processed.seriesNames;
		chartStore.seriesColours = processed.seriesColours;
		chartStore.seriesLabels = processed.seriesLabels;
	});

	// Metric-dependent options (unit + curve)
	$effect(() => {
		if (!chartStore) return;
		if (isPriceKind) {
			chartStore.chartOptions.selectedCurveType = /** @type {any} */ (
				getIntervalSpec(displayInterval)?.curveType ?? 'straight'
			);
			return;
		}
		chartStore.chartOptions.baseUnit = isEnergyMetric ? 'Wh' : 'W';
		chartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			isEnergyMetric ? 'step' : 'straight'
		);
	});

	// Memoises the slice + display aggregation so pan ticks within one native
	// sample reuse the previous rows array (stable reference → the seriesData
	// assignment below is a signal no-op on a hit).
	const visibleAggregation = createVisibleAggregation();

	// Visible data + axis
	$effect(() => {
		const manager = dataManager;
		if (!chartStore || !manager?.processedCache) return;

		perfSpan('chart:viewport-effect', () => {
			const start = viewStart;
			const end = viewEnd;
			const currentDisplayInterval = displayInterval;
			const isEnergy = isEnergyMetric;

			const visibleData = visibleAggregation(manager.processedCache, {
				viewStart: start,
				viewEnd: end,
				apiInterval: interval,
				displayInterval: currentDisplayInterval,
				ianaTimeZone,
				method: isEnergy ? 'sum' : 'mean'
			});

			chartStore.seriesData = visibleData;
			chartStore.setXDomain(start, end);
			chartStore.setYDomain(undefined);

			applyFacilityTimeAxis(chartStore, {
				data: visibleData,
				viewStart: start,
				viewEnd: end,
				ianaTimeZone,
				timeZone,
				isEnergy: isEnergy || getIntervalSpec(displayInterval)?.curveType === 'step',
				displayInterval: currentDisplayInterval
			});
		});
	});

	// Debounced visible-data callback for the external table
	/** @type {ReturnType<typeof setTimeout> | null} */
	let tableDebounceTimer = null;
	$effect(() => {
		const start = viewStart;
		const end = viewEnd;
		const currentDisplayInterval = displayInterval;
		const currentInterval = interval;
		const currentIana = ianaTimeZone;
		const isEnergy = isEnergyMetric;
		const manager = dataManager;
		const _cache = manager?.processedCache;
		const callback = onvisibledata;

		if (tableDebounceTimer) clearTimeout(tableDebounceTimer);
		if (!callback || !manager?.processedCache || !manager.seriesMeta) return;

		const meta = manager.seriesMeta;
		tableDebounceTimer = setTimeout(() => {
			// Usually a memo hit — the viewport effect computed the same slice with
			// the same options 300ms ago.
			const rows = visibleAggregation(manager.processedCache, {
				viewStart: start,
				viewEnd: end,
				apiInterval: currentInterval,
				displayInterval: currentDisplayInterval,
				ianaTimeZone: currentIana,
				method: isEnergy ? 'sum' : 'mean'
			});
			callback({ data: rows, seriesNames: meta.seriesNames, seriesLabels: meta.seriesLabels });
		}, 300);

		return () => {
			if (tableDebounceTimer) clearTimeout(tableDebounceTimer);
		};
	});

	let showLoadingOverlay = $derived(computeShowLoadingOverlay(dataManager, chartStore));

	// ============================================
	// Pan / zoom
	// ============================================

	const {
		handlePanStart,
		handlePan,
		handlePanEnd,
		handleZoom,
		zoomIn,
		zoomOut,
		dispose: disposeGestures
	} = createViewportGestures({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		apply: (start, end) => {
			viewStart = start;
			viewEnd = end;
		},
		minDurationMs: () => MIN_VIEWPORT_MS,
		maxDurationMs: () => MAX_VIEWPORT_MS,
		minDateMs: () => minDateMs,
		onGestureStart: () => {
			isPanning = true;
			chartStore?.clearHover();
		},
		onGestureEnd: () => {
			isPanning = false;
		},
		onMove: (start, end) => {
			const buffer = (end - start) * fetchBufferMultiplier;
			dataManager?.requestRange(start - buffer, end + buffer);
		},
		onPanEnd: (direction, start, end) => {
			const prefetch = (end - start) * fetchBufferMultiplier;
			if (direction === -1) {
				dataManager?.requestRange(end, Math.min(end + prefetch, Date.now()));
			} else {
				dataManager?.requestRange(start - prefetch, start);
			}
		},
		onSettle: (start, end) => {
			// Parent first — it may flip metric/interval synchronously (grain
			// switch); reconcileFetches skips the old grain when that happens.
			onviewportsettle?.({ start, end });
			reconcileFetches();
		}
	});

	$effect(() => {
		const start = viewStart;
		const end = viewEnd;
		if (!start || !end) return;
		onviewportchange?.({ start, end });
	});

	let isAtMinZoom = $derived(viewEnd - viewStart <= MIN_VIEWPORT_MS);
	let isAtMaxZoom = $derived(
		viewEnd - viewStart >= MAX_VIEWPORT_MS || isViewportPinned(viewStart, viewEnd, minDateMs)
	);

	// ============================================
	// Hover / focus
	// ============================================

	/** @param {number} time @param {string} [key] */
	function handleHover(time, key) {
		if (isPanning) return;
		chartStore?.setHover(time, key);
		onhoverchange?.(time);
	}
	function handleHoverEnd() {
		chartStore?.clearHover();
		onhoverchange?.(undefined);
	}

	$effect(() => {
		if (!onhoverchange) return;
		const t = hoverTime;
		if (!chartStore) return;
		if (chartStore.hoverTime === t) return;
		if (t === undefined) chartStore.clearHover();
		else chartStore.setHover(t);
	});

	/** @param {number} time */
	function handleFocus(time) {
		if (isPanning) return;
		chartStore?.toggleFocus(time);
	}

	// ============================================
	// Public API
	// ============================================

	/** @param {number} startMs @param {number} endMs */
	export function setViewport(startMs, endMs) {
		const now = Date.now();
		viewStart = Math.max(startMs, minDateMs);
		viewEnd = Math.min(endMs, now);
		if (dataManager && (dataManager.interval !== interval || dataManager.metric !== metric)) {
			return;
		}
		const duration = viewEnd - viewStart;
		const buffer = duration * fetchBufferMultiplier;
		dataManager?.requestRange(viewStart - buffer, Math.min(viewEnd + buffer, now));
	}

	/**
	 * Cancel in-flight work outside the current buffered window and fetch the
	 * final gaps immediately. Called when a gesture settles — locally via
	 * onSettle, and by the Explorer for peer panels that were fed per-frame
	 * setViewport calls during the gesture.
	 */
	export function reconcileFetches() {
		if (!viewStart || !viewEnd || !dataManager) return;
		// A grain switch is pending (props flipped, manager not yet swapped) —
		// don't fetch the old grain; the manager-swap effect fetches the new one
		// immediately and its dispose-before-stash aborts the stale work.
		if (dataManager.interval !== interval || dataManager.metric !== metric) return;
		const buffer = (viewEnd - viewStart) * fetchBufferMultiplier;
		dataManager.reconcileWindow(viewStart - buffer, Math.min(viewEnd + buffer, Date.now()));
	}
</script>

{#if chartStore}
	<div class="group relative {showContainer ? 'rounded-lg p-4' : ''}">
		<StratumChart
			chart={chartStore}
			{showHeader}
			{tooltipMode}
			zoomMode="static"
			onzoomin={zoomIn}
			onzoomout={zoomOut}
			{isAtMinZoom}
			{isAtMaxZoom}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
			onfocus={handleFocus}
			onpanstart={handlePanStart}
			onpan={handlePan}
			onpanend={handlePanEnd}
			onzoom={handleZoom}
			enablePan={true}
			{panZoomMode}
			bind:engaged={panZoomEngaged}
			viewDomain={null}
			loadingRanges={dataManager?.loadingRanges ?? []}
		/>

		{#if showLoadingOverlay}
			<div class="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
				<span class="text-sm text-mid-warm-grey">Loading data…</span>
			</div>
		{/if}
	</div>
{:else}
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center {chartHeightPx
			? ''
			: chartHeight}"
		style:height={chartHeightPx ? `${chartHeightPx}px` : undefined}
	>
		<span class="text-sm text-mid-warm-grey">Loading data…</span>
	</div>
{/if}
