<script>
	/**
	 * InterconnectorChart — corridor flow / two-region price chart for the
	 * Tracker's interconnector panel.
	 *
	 * Same recipe as `NetworkChart` (ChartStore + ChartDataManager through
	 * StratumChart with the shared pan/zoom, gap-aware caching and
	 * display-aggregation pipeline) with one twist: the fetch URL is
	 * corridor-agnostic (`region=_all&primary_grouping=network_region`), and the
	 * processors emit EVERY corridor/region series — the corridor prop only
	 * narrows which series render via `chartStore.seriesNames`. Switching
	 * corridors is therefore a series-name swap: no refetch, no reprocess, and
	 * both chart kinds share `sharedFetch`/LRU entries per (metric, interval,
	 * window).
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
	import { getNumberFormat } from '$lib/utils/formatters';
	import { ianaFromOffset } from '../v2/network-time.js';
	import { perfSpan } from '../v2/perf.js';
	import { getInterconnector } from '$lib/flows/region-geo.js';
	import { processPairwiseFlows } from './process-pairwise-flows.js';
	import { processRegionPrices } from './process-region-prices.js';

	/**
	 * @typedef {Object} Props
	 * @property {string} interconnectorKey - Directed corridor key ('NSW1->QLD1')
	 * @property {'flows' | 'flows_energy' | 'price'} [metric] - API metric; 'price' renders the
	 *   two adjacent regions' price lines, the flows pair a corridor MW line (power↔energy ladder)
	 * @property {string} [interval] - Native OE interval (5m, 1h, 1d, 1M…)
	 * @property {string} [displayInterval] - Display interval for aggregation
	 * @property {string} [dateStart] - Initial viewport start (YYYY-MM-DD)
	 * @property {string} [dateEnd] - Initial viewport end (YYYY-MM-DD)
	 * @property {string} [title] - Chart header title
	 * @property {string} [chartHeight] - Height class
	 * @property {'strip' | 'compact-strip' | 'floating' | 'none'} [tooltipMode]
	 * @property {number | undefined} [hoverTime] - External hover time for cross-chart sync
	 * @property {((time: number | undefined) => void)} [onhoverchange]
	 * @property {((range: {start: number, end: number}) => void)} [onviewportchange]
	 * @property {((range: {start: number, end: number}) => void)} [onviewportsettle]
	 * @property {((state: { hasData: boolean }) => void)} [onloadcomplete] - Called once the
	 *   initial fetch settles; `hasData` distinguishes "still loading" from "no data"
	 * @property {'always' | 'tap-to-engage'} [panZoomMode]
	 * @property {boolean} [panZoomEngaged]
	 */

	/** @type {Props} */
	let {
		interconnectorKey,
		metric = 'flows',
		interval = '5m',
		displayInterval = '30m',
		dateStart = '',
		dateEnd = '',
		title = '',
		chartHeight = 'h-[240px]',
		tooltipMode = /** @type {'strip' | 'compact-strip' | 'floating' | 'none'} */ ('floating'),
		hoverTime = undefined,
		onhoverchange,
		onviewportchange,
		onviewportsettle,
		onloadcomplete,
		panZoomMode = /** @type {'always' | 'tap-to-engage'} */ ('always'),
		panZoomEngaged = $bindable(false)
	} = $props();

	const dollarFormatter = getNumberFormat(0);

	// NEM-bound by construction (the corridors are NEM interconnectors).
	const NEM_TZ = '+10:00';
	const ianaTimeZone = ianaFromOffset(NEM_TZ);

	let isFlowKind = $derived(metric !== 'price');
	let isEnergyMetric = $derived(metric.endsWith('_energy'));
	let interconnector = $derived(getInterconnector(interconnectorKey));

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

	/**
	 * The corridor is deliberately NOT captured here — processors emit every
	 * series, so one processed cache serves all corridors.
	 */
	let processResponseFn = $derived.by(() => {
		if (isFlowKind) {
			const currentMetric = /** @type {'flows' | 'flows_energy'} */ (metric);
			return (/** @type {any} */ resp) =>
				processPairwiseFlows(resp, { metricFilter: currentMetric, networkTimezone: NEM_TZ });
		}
		return (/** @type {any} */ resp) => processRegionPrices(resp, { networkTimezone: NEM_TZ });
	});

	/**
	 * Corridor-agnostic fetch URL: all regions in one response so the pairwise
	 * derivation has every leg, and every corridor/kind shares cache entries.
	 * @param {URLSearchParams} params
	 */
	function buildFetchUrl(params) {
		params.set('region', '_all');
		params.set('primary_grouping', 'network_region');
		return `/api/network/data?${params.toString()}`;
	}

	// ============================================
	// Data manager
	// ============================================

	/** @type {ChartDataManager | null} */
	let dataManager = $state(null);

	/**
	 * Warm managers stashed on swap (keyed by grain via managerKey) so
	 * hysteresis flips (flows ↔ flows_energy) revive cached data instantly.
	 */
	const managerStash = createManagerStash();

	/** All series ship in every response, so the series identity is constant. */
	const SERIES_KEY = 'pairwise';

	/**
	 * @param {ChartDataManager | null | undefined} manager
	 * @param {string} currentCacheKey
	 */
	function stashOrDispose(manager, currentCacheKey) {
		if (!manager) return;
		manager.dispose();
		if (manager.cacheKey !== currentCacheKey) return;
		managerStash.stash(managerKey(manager.interval, manager.metric, manager.seriesKey), manager);
	}

	$effect(() => {
		const currentMetric = metric;
		const currentInterval = interval;
		const currentCacheKey = isFlowKind ? 'ic:flows' : 'ic:prices';
		const processFn = processResponseFn;

		const existing = untrack(() => dataManager);
		if (
			existing &&
			existing.cacheKey === currentCacheKey &&
			existing.interval === currentInterval &&
			existing.metric === currentMetric &&
			existing.seriesKey === SERIES_KEY
		) {
			return;
		}

		const revived = managerStash.take(managerKey(currentInterval, currentMetric, SERIES_KEY));
		const manager =
			revived ??
			new ChartDataManager({
				cacheKey: currentCacheKey,
				networkTimezone: NEM_TZ,
				interval: currentInterval,
				metric: currentMetric,
				seriesKey: SERIES_KEY,
				processResponse: processFn,
				buildFetchUrl
			});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);

		if (!start && !end) {
			if (dateStart && dateEnd) {
				viewStart = new Date(dateStart + 'T00:00:00' + NEM_TZ).getTime();
				viewEnd = Math.min(new Date(dateEnd + 'T23:59:59' + NEM_TZ).getTime(), Date.now());
			}
		}

		const vs = untrack(() => viewStart);
		const ve = untrack(() => viewEnd);
		if (vs && ve) {
			const duration = ve - vs;
			const buffer = duration * fetchBufferMultiplier;
			manager.requestRange(vs - buffer, Math.min(ve + buffer, Date.now()), { immediate: true });
		}

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

	/**
	 * @param {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 */
	function applyCommonStyles(chart) {
		chart.chartStyles.chartHeightClasses = chartHeight;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.chartStyles.snapTicks = true;
	}

	// One store per kind for the instance's lifetime. Deliberately does NOT read
	// `title` — the flow title flips 'Flow' ↔ 'Energy' on every hysteresis grain
	// switch, and reading it here would tear down and rebuild the whole chart
	// pipeline each flip; the sync effect below applies it instead.
	/** @type {import('$lib/components/charts/v2/ChartStore.svelte.js').default} */
	let chartStore = $derived.by(() => {
		if (isFlowKind) {
			const chart = new ChartStore({
				key: Symbol('ic-flow'),
				title: 'Flow',
				prefix: 'M',
				displayPrefix: 'M',
				baseUnit: 'W',
				chartType: 'line',
				timeZone: NEM_TZ
			});
			applyCommonStyles(chart);
			chart.hideDataOptions = true;
			chart.hideChartTypeOptions = true;
			chart.chartTooltips.showTotal = false;
			chart.formatTickX = (/** @type {any} */ d) => formatXAxis(d, ianaTimeZone);
			return chart;
		}

		const chart = new ChartStore({
			key: Symbol('ic-price'),
			title: 'Price',
			prefix: '',
			displayPrefix: '',
			baseUnit: '$/MWh',
			chartType: 'line',
			timeZone: NEM_TZ
		});
		applyCommonStyles(chart);
		chart.hideDataOptions = true;
		chart.hideChartTypeOptions = true;
		chart.chartTooltips.showTotal = false;
		chart.useFormatY = true;
		chart.formatY = (/** @type {number} */ d) => '$' + dollarFormatter.format(d);
		return chart;
	});

	// Title sync
	$effect(() => {
		chartStore.title = title || (isFlowKind ? 'Flow' : 'Price');
	});

	// Series metadata — the corridor narrows what renders here, nowhere else:
	// flow shows the corridor's series, price the corridor's two regions.
	$effect(() => {
		if (!dataManager?.processedCache) return;
		const processed = dataManager.processedCache;
		const ic = interconnector;
		if (isFlowKind) {
			chartStore.seriesNames = ic ? [ic.key] : processed.seriesNames;
		} else {
			chartStore.seriesNames = ic
				? processed.seriesNames.filter(
						(/** @type {string} */ name) => name === ic.from || name === ic.to
					)
				: processed.seriesNames;
		}
		chartStore.seriesColours = processed.seriesColours;
		chartStore.seriesLabels = processed.seriesLabels;
	});

	// Unit + curve per metric — flow energy sums render stepped like the
	// facility energy charts; 5m/1h power and price follow the interval spec.
	$effect(() => {
		if (isFlowKind) {
			chartStore.chartOptions.baseUnit = isEnergyMetric ? 'Wh' : 'W';
			chartStore.chartOptions.selectedCurveType = /** @type {any} */ (
				isEnergyMetric ? 'step' : 'straight'
			);
			return;
		}
		chartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			getIntervalSpec(displayInterval)?.curveType ?? 'straight'
		);
	});

	// Memoises the slice + display aggregation so pan ticks within one native
	// sample reuse the previous rows array.
	const visibleAggregation = createVisibleAggregation();

	// Visible data + axis
	$effect(() => {
		const manager = dataManager;
		if (!manager?.processedCache) return;

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
				timeZone: NEM_TZ,
				isEnergy: isEnergy || getIntervalSpec(displayInterval)?.curveType === 'step',
				displayInterval: currentDisplayInterval
			});
		});
	});

	let showLoadingOverlay = $derived(computeShowLoadingOverlay(dataManager, chartStore));

	// Report load completion once the in-flight fetch settles — `cacheStart` is a
	// stable "data was found" signal that survives panning. No stale-viewport
	// retry here (unlike FacilityChart): the tracker window is always recent.
	$effect(() => {
		const manager = dataManager;
		if (!manager?.initialLoadComplete) return;
		if (manager.hasPendingFetch) return;
		onloadcomplete?.({ hasData: manager.cacheStart !== null });
	});

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
		minDateMs: () => EARLIEST_DATA_MS,
		onGestureStart: () => {
			isPanning = true;
			chartStore.clearHover();
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
		viewEnd - viewStart >= MAX_VIEWPORT_MS || isViewportPinned(viewStart, viewEnd, EARLIEST_DATA_MS)
	);

	// ============================================
	// Hover / focus
	// ============================================

	/** @param {number} time @param {string} [key] */
	function handleHover(time, key) {
		if (isPanning) return;
		chartStore.setHover(time, key);
		onhoverchange?.(time);
	}
	function handleHoverEnd() {
		chartStore.clearHover();
		onhoverchange?.(undefined);
	}

	$effect(() => {
		if (!onhoverchange) return;
		const t = hoverTime;
		if (chartStore.hoverTime === t) return;
		if (t === undefined) chartStore.clearHover();
		else chartStore.setHover(t);
	});

	/** @param {number} time */
	function handleFocus(time) {
		if (isPanning) return;
		chartStore.toggleFocus(time);
	}

	// ============================================
	// Public API
	// ============================================

	/** @param {number} startMs @param {number} endMs */
	export function setViewport(startMs, endMs) {
		const now = Date.now();
		viewStart = Math.max(startMs, EARLIEST_DATA_MS);
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
	 * onSettle, and by the panel for the peer chart fed per-frame setViewport
	 * calls during the gesture.
	 */
	export function reconcileFetches() {
		if (!viewStart || !viewEnd || !dataManager) return;
		if (dataManager.interval !== interval || dataManager.metric !== metric) return;
		const buffer = (viewEnd - viewStart) * fetchBufferMultiplier;
		dataManager.reconcileWindow(viewStart - buffer, Math.min(viewEnd + buffer, Date.now()));
	}
</script>

<div class="group relative">
	<StratumChart
		chart={chartStore}
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
