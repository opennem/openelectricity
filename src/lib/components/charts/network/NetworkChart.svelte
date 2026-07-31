<script>
	/**
	 * NetworkChart — reusable network-level visualisation for the Explorer.
	 *
	 * Network analogue of `FacilityChart`: drives a `ChartStore` + `ChartDataManager`
	 * through `StratumChart`, reusing the same pan/zoom, gap-aware caching and
	 * display-aggregation pipeline. Data comes from `/api/network/data` instead of
	 * the facility endpoint, and series are fuel-tech groups (Generation), a
	 * single spot-price line (Price), or market series — demand, curtailment and
	 * flows plus their `_energy` variants — configured via `market-metrics.js`.
	 */

	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { createVisibleAggregation } from '$lib/components/charts/v2/display-aggregation.js';
	import { formatXAxis, applyFacilityTimeAxis } from '$lib/components/charts/v2/formatters.js';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { createChartHost } from '$lib/components/charts/v2/chart-host.svelte.js';
	import { showLoadingOverlay as computeShowLoadingOverlay } from '$lib/components/charts/v2/chart-loading-state.js';
	import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
	import { processNetworkData } from './process-network-data.js';
	import { processPriceData } from '$lib/components/charts/facility/process-price-data.js';
	import { processMarketData } from './process-market-data.js';
	import { getMarketMetricConfig } from './market-metrics.js';
	import { getGroup } from './groups.js';
	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { loadFuelTechs } from '$lib/fuel_techs';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { ianaFromOffset } from '../v2/network-time.js';
	import { perfSpan } from '../v2/perf.js';

	/**
	 * @typedef {Object} Props
	 * @property {string} region - Explorer region value ('_all', 'nsw1'…, 'wem')
	 * @property {'power' | 'energy' | 'price' | 'demand' | 'demand_energy' | 'curtailment' | 'curtailment_energy' | 'curtailment_wind' | 'curtailment_wind_energy' | 'curtailment_solar' | 'curtailment_solar_energy' | 'flows' | 'flows_energy'} [metric] - API metric
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
	 * @property {string[]} [hiddenSeriesNames] - Series ids to hide, e.g. a market
	 *   split whose source is toggled off elsewhere on the page. Applied on top of
	 *   the chart's own legend toggles, so it wins until the caller clears it.
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
		hiddenSeriesNames = /** @type {string[]} */ ([]),
		panZoomMode = /** @type {'always' | 'tap-to-engage'} */ ('always'),
		panZoomEngaged = $bindable(false),
		minDateMs = EARLIEST_DATA_MS
	} = $props();

	const dollarFormatter = getNumberFormat(0);

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let isPriceKind = $derived(chartKind === 'line');
	let marketConfig = $derived(getMarketMetricConfig(metric));
	let isEnergyMetric = $derived(metric === 'energy' || metric.endsWith('_energy'));

	/** Fine grain (sub-daily) drives the power-style viewport limits. */
	let fineGrain = $derived(interval === '5m' || interval === '1h');

	// ============================================
	// Series processing config
	// ============================================

	let groupConfig = $derived(getGroup(group));

	/**
	 * Process function for the active panel — fuel-tech-grouped generation, a
	 * single price line, or configured market series. Captured into the data
	 * manager so it runs on every fetch.
	 */
	let processResponseFn = $derived.by(() => {
		const tz = timeZone || '+10:00';
		if (marketConfig) {
			const cfg = marketConfig;
			return (/** @type {any} */ resp) =>
				processMarketData(resp, { seriesDefs: cfg.seriesDefs, networkTimezone: tz });
		}
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
	// Chart host — shared manager lifecycle, viewport + pan/zoom recipe
	// ============================================

	// The processed series set is group-dependent for generation panels only —
	// price and market metrics carry a fixed series set. `processResponseFn`
	// already depends on `group` (via groupConfig), so a group change swaps the
	// manager with a fresh processor.
	let seriesKey = $derived(isPriceKind || marketConfig ? '' : group);

	const host = createChartHost({
		cacheKey: () => `${region}:${chartKind}`,
		interval: () => interval,
		metric: () => metric,
		seriesKey: () => seriesKey,
		// A region change means a different data source — drop the warm managers.
		stashScope: () => region,
		createManager: () =>
			new ChartDataManager({
				cacheKey: `${region}:${chartKind}`,
				networkTimezone: timeZone || '+10:00',
				interval,
				metric,
				seriesKey,
				processResponse: processResponseFn,
				buildFetchUrl
			}),
		initialViewport: () => {
			if (!dateStart || !dateEnd) return null;
			const tz = timeZone || '+10:00';
			return {
				start: new Date(dateStart + 'T00:00:00' + tz).getTime(),
				end: Math.min(new Date(dateEnd + 'T23:59:59' + tz).getTime(), Date.now())
			};
		},
		fetchBufferMultiplier: () => (fineGrain ? 1 : 3),
		minDateMs: () => minDateMs,
		fineViewportLimits: () => fineGrain,
		onGestureStart: () => chartStore?.clearHover(),
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
	 * Presentation shared by every panel kind — height, padding and tick
	 * snapping. Called inside the `chartStore` derived so the prop reads
	 * (chartHeight, chartHeightPx) stay tracked exactly as before.
	 * @param {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 */
	function applyCommonStyles(chart) {
		chart.chartStyles.chartHeightClasses = chartHeight;
		if (chartHeightPx) chart.chartStyles.chartHeightPx = chartHeightPx;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.chartStyles.snapTicks = true;
	}

	/**
	 * Time-axis tick labels for the market and generation arms — the price arm
	 * keeps the ChartStore default.
	 * @param {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 */
	function applyTimeTickFormat(chart) {
		chart.formatTickX = (/** @type {any} */ d) => formatXAxis(d, ianaTimeZone);
	}

	/** @type {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} */
	let chartStore = $derived.by(() => {
		// Recreated when the panel kind flips (isPriceKind tracks chartKind).
		if (marketConfig) {
			const chart = new ChartStore({
				key: Symbol('network-market'),
				title: title || 'Market',
				prefix: /** @type {SiPrefix} */ (marketConfig.prefix),
				displayPrefix: /** @type {SiPrefix} */ (marketConfig.prefix),
				baseUnit: marketConfig.baseUnit,
				// Line kind renders as a line; stacked kind takes the constructor's
				// 'stacked-area' default, same as the generation store.
				chartType: marketConfig.chartKind === 'line' ? 'line' : undefined,
				timeZone
			});
			applyCommonStyles(chart);
			chart.hideDataOptions = true;
			chart.hideChartTypeOptions = true;
			chart.useDivergingStack = marketConfig.diverging ?? useDivergingStack;
			if (marketConfig.chartKind === 'line') chart.chartTooltips.showTotal = false;
			applyTimeTickFormat(chart);
			return chart;
		}

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
			applyCommonStyles(chart);
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
		applyCommonStyles(chart);
		chart.useDivergingStack = useDivergingStack;
		applyTimeTickFormat(chart);
		return chart;
	});

	// Keep height in sync on panel resize
	$effect(() => {
		if (chartStore && chartHeightPx) chartStore.chartStyles.chartHeightPx = chartHeightPx;
	});

	// Title sync
	$effect(() => {
		if (chartStore)
			chartStore.title = title || (marketConfig ? 'Market' : isPriceKind ? 'Price' : 'Generation');
	});

	// Series metadata
	$effect(() => {
		if (!chartStore || !dataManager?.processedCache) return;
		const processed = dataManager.processedCache;
		chartStore.seriesNames = processed.seriesNames;
		chartStore.seriesColours = processed.seriesColours;
		chartStore.seriesLabels = processed.seriesLabels;
	});

	// Caller-driven series hiding, kept separate from the metadata effect so a
	// refetch doesn't clear it and a toggle doesn't re-run series setup.
	$effect(() => {
		if (chartStore) chartStore.hiddenSeriesNames = hiddenSeriesNames;
	});

	// Metric-dependent options (unit + curve)
	$effect(() => {
		if (!chartStore) return;
		if (marketConfig) {
			chartStore.chartOptions.baseUnit = marketConfig.baseUnit;
			chartStore.chartOptions.selectedCurveType = /** @type {any} */ (
				marketConfig.chartKind === 'line'
					? (getIntervalSpec(displayInterval)?.curveType ?? 'straight')
					: isEnergyMetric
						? 'step'
						: 'straight'
			);
			return;
		}
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
	// Public API — delegated to the shared chart host
	// ============================================

	/** @param {number} startMs @param {number} endMs */
	export function setViewport(startMs, endMs) {
		host.setViewport(startMs, endMs);
	}

	/**
	 * Cancel in-flight work outside the current buffered window and fetch the
	 * final gaps immediately. Called when a gesture settles — locally via the
	 * host's onSettle, and by the Explorer for peer panels that were fed
	 * per-frame setViewport calls during the gesture.
	 */
	export function reconcileFetches() {
		host.reconcileFetches();
	}
</script>

{#if chartStore}
	<div class="group relative {showContainer ? 'rounded-lg p-4' : ''}">
		<StratumChart
			chart={chartStore}
			{showHeader}
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
