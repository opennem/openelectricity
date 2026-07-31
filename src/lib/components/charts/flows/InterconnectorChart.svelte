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

	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { createVisibleAggregation } from '$lib/components/charts/v2/display-aggregation.js';
	import { formatXAxis, applyFacilityTimeAxis } from '$lib/components/charts/v2/formatters.js';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { createChartHost } from '$lib/components/charts/v2/chart-host.svelte.js';
	import { showLoadingOverlay as computeShowLoadingOverlay } from '$lib/components/charts/v2/chart-loading-state.js';
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
	// Chart host — shared manager lifecycle, viewport + pan/zoom recipe
	// ============================================

	/** All series ship in every response, so the series identity is constant. */
	const SERIES_KEY = 'pairwise';

	const host = createChartHost({
		cacheKey: () => (isFlowKind ? 'ic:flows' : 'ic:prices'),
		interval: () => interval,
		metric: () => metric,
		seriesKey: () => SERIES_KEY,
		// The kind is the only source boundary; grain flips (flows ↔
		// flows_energy) keep the warm stash.
		stashScope: () => (isFlowKind ? 'ic:flows' : 'ic:prices'),
		createManager: () =>
			new ChartDataManager({
				cacheKey: isFlowKind ? 'ic:flows' : 'ic:prices',
				networkTimezone: NEM_TZ,
				interval,
				metric,
				seriesKey: SERIES_KEY,
				processResponse: processResponseFn,
				buildFetchUrl
			}),
		initialViewport: () => {
			if (!dateStart || !dateEnd) return null;
			return {
				start: new Date(dateStart + 'T00:00:00' + NEM_TZ).getTime(),
				end: Math.min(new Date(dateEnd + 'T23:59:59' + NEM_TZ).getTime(), Date.now())
			};
		},
		fetchBufferMultiplier: () => (fineGrain ? 1 : 3),
		minDateMs: () => EARLIEST_DATA_MS,
		fineViewportLimits: () => fineGrain,
		onGestureStart: () => chartStore.clearHover(),
		onviewportchange: (range) => onviewportchange?.(range),
		onviewportsettle: (range) => onviewportsettle?.(range)
	});

	let dataManager = $derived(host.dataManager);
	let viewStart = $derived(host.viewStart);
	let viewEnd = $derived(host.viewEnd);
	let isPanning = $derived(host.isPanning);

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
	// Public API — delegated to the shared chart host
	// ============================================

	/** @param {number} startMs @param {number} endMs */
	export function setViewport(startMs, endMs) {
		host.setViewport(startMs, endMs);
	}

	export function reconcileFetches() {
		host.reconcileFetches();
	}
</script>

<div class="group relative">
	<StratumChart
		chart={chartStore}
		{tooltipMode}
		zoomMode="static"
		onzoomin={host.zoomIn}
		onzoomout={host.zoomOut}
		isAtMinZoom={host.isAtMinZoom}
		isAtMaxZoom={host.isAtMaxZoom}
		onhover={handleHover}
		onhoverend={handleHoverEnd}
		onfocus={handleFocus}
		onpanstart={host.handlePanStart}
		onpan={host.handlePan}
		onpanend={host.handlePanEnd}
		onzoom={host.handleZoom}
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
