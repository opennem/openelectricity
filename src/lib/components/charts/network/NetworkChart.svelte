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
	import {
		processEmissionsIntensity,
		deriveIntensityDisplayRows,
		INTENSITY_SERIES_ID
	} from './process-emissions-intensity.js';
	import { processPriceData } from '$lib/components/charts/facility/process-price-data.js';
	import { processMarketData } from './process-market-data.js';
	import { LINE_COLOUR } from '$lib/components/charts/facility/colours.js';
	import { getMarketMetricConfig } from './market-metrics.js';
	import { getGroup } from './groups.js';
	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { loadFuelTechs } from '$lib/fuel_techs';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { ianaFromOffset } from '../v2/network-time.js';
	import { perfSpan } from '../v2/perf.js';
	import nighttimes from '$lib/utils/nighttimes';

	/**
	 * @typedef {Object} Props
	 * @property {string} region - Explorer region value ('_all', 'nsw1'…, 'wem')
	 * @property {'power' | 'energy' | 'emissions' | 'emissions_intensity' | 'price' | 'demand' | 'demand_energy' | 'curtailment' | 'curtailment_energy' | 'curtailment_wind' | 'curtailment_wind_energy' | 'curtailment_solar' | 'curtailment_solar_energy' | 'flows' | 'flows_energy'} [metric] - API metric
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
	 * @property {((tableData: {data: any[], seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string>}) => void)} [onvisibledata]
	 * @property {((info: {hasData: boolean}) => void)} [onloadcomplete] - Fired whenever a settled
	 *   fetch leaves the manager idle; the first fire is the initial load, where
	 *   parents apply their default range preset
	 * @property {string[]} [hiddenSeriesNames] - Series ids to hide, e.g. a market
	 *   split whose source is toggled off elsewhere on the page. Applied on top of
	 *   the chart's own legend toggles, so it wins until the caller clears it.
	 * @property {'always' | 'tap-to-engage'} [panZoomMode]
	 * @property {boolean} [panZoomEngaged]
	 * @property {number} [minDateMs] - Viewport left-edge floor (default: EARLIEST_DATA_MS)
	 * @property {boolean} [nightShading] - Shade nighttime bands like the homepage
	 *   7-day chart; only renders at sub-daily grain, coarser grains clear it
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
		onloadcomplete,
		hiddenSeriesNames = /** @type {string[]} */ ([]),
		panZoomMode = /** @type {'always' | 'tap-to-engage'} */ ('always'),
		panZoomEngaged = $bindable(false),
		minDateMs = EARLIEST_DATA_MS,
		nightShading = false
	} = $props();

	const dollarFormatter = getNumberFormat(0);

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let isPriceKind = $derived(chartKind === 'line');
	let marketConfig = $derived(getMarketMetricConfig(metric));
	let isEmissionsMetric = $derived(metric === 'emissions');
	let isIntensityMetric = $derived(metric === 'emissions_intensity');
	let isEnergyMetric = $derived(metric === 'energy' || metric.endsWith('_energy'));

	/** The five panel kinds in priority order. The order is load-bearing —
	 *  intensity and line-kind market metrics also pass chartKind="line", so
	 *  every branch site must consult THIS discriminator, never the raw flags,
	 *  or those kinds fall through to the price arm. */
	let panelKind = $derived(
		isIntensityMetric
			? /** @type {const} */ ('intensity')
			: isEmissionsMetric
				? /** @type {const} */ ('emissions')
				: marketConfig
					? /** @type {const} */ ('market')
					: isPriceKind
						? /** @type {const} */ ('price')
						: /** @type {const} */ ('generation')
	);

	/** Default header title per panel kind — the constructors and the title
	 *  sync effect both read this so the ladder lives once. */
	let defaultTitle = $derived(
		{
			intensity: 'Emissions Intensity',
			emissions: 'Emissions',
			market: 'Market',
			price: 'Price',
			generation: 'Generation'
		}[panelKind]
	);

	/** Per-bucket quantities (MWh, tonnes, intensity components) aggregate by
	 *  sum; instantaneous ones (MW, $/MWh) by mean. */
	let sumsForDisplay = $derived(isEnergyMetric || isEmissionsMetric || isIntensityMetric);

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
	/** Native bucket length for the intensity MWh conversion — only read at the
	 *  sub-daily grains where the route fetches a power basis. */
	let intervalHours = $derived(interval === '5m' ? 5 / 60 : interval === '1h' ? 1 : 24);

	let processResponseFn = $derived.by(() => {
		const tz = timeZone || '+10:00';
		if (panelKind === 'intensity') {
			const hours = intervalHours;
			return (/** @type {any} */ resp) =>
				processEmissionsIntensity(resp, { intervalHours: hours, networkTimezone: tz });
		}
		if (panelKind === 'market') {
			const cfg = /** @type {NonNullable<typeof marketConfig>} */ (marketConfig);
			return (/** @type {any} */ resp) =>
				processMarketData(resp, { seriesDefs: cfg.seriesDefs, networkTimezone: tz });
		}
		if (panelKind === 'price') {
			return (/** @type {any} */ resp) =>
				processPriceData(resp, { metricFilter: 'price', networkTimezone: tz });
		}
		const cfg = {
			groupMap: groupConfig.fuelTechs,
			groupOrder: groupConfig.order,
			groupLabels: groupConfig.labels,
			// Emissions are only ever produced — the charging/pumping fuel techs
			// carry zero-or-positive tonnes, so nothing inverts.
			loadsToInvert: panelKind === 'emissions' ? [] : loadFuelTechs,
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
	let seriesKey = $derived(panelKind === 'generation' || panelKind === 'emissions' ? group : '');

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
		// Recreated when the panel kind flips.
		if (panelKind === 'intensity' || panelKind === 'emissions') {
			const intensity = panelKind === 'intensity';
			const chart = new ChartStore({
				key: Symbol(`network-${panelKind}`),
				title: title || defaultTitle,
				prefix: '',
				displayPrefix: '',
				baseUnit: intensity ? 'kgCO₂e/MWh' : 't',
				chartType: intensity ? 'line' : undefined,
				timeZone
			});
			applyCommonStyles(chart);
			chart.hideDataOptions = true;
			chart.hideChartTypeOptions = true;
			// Single-series line — the strip total would just repeat the value.
			if (intensity) chart.chartTooltips.showTotal = false;
			applyTimeTickFormat(chart);
			return chart;
		}

		if (panelKind === 'market' && marketConfig) {
			const chart = new ChartStore({
				key: Symbol('network-market'),
				title: title || defaultTitle,
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

		if (panelKind === 'price') {
			const chart = new ChartStore({
				key: Symbol('network-price'),
				title: title || defaultTitle,
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
			title: title || defaultTitle,
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
		if (chartStore) chartStore.title = title || defaultTitle;
	});

	// Series metadata. The intensity line is derived at display time from the
	// manager's component series (emissions + energy), so its store meta is
	// fixed rather than copied from the processed cache.
	$effect(() => {
		if (!chartStore) return;
		if (panelKind === 'intensity') {
			chartStore.seriesNames = [INTENSITY_SERIES_ID];
			chartStore.seriesColours = { [INTENSITY_SERIES_ID]: LINE_COLOUR };
			chartStore.seriesLabels = { [INTENSITY_SERIES_ID]: 'Emissions Intensity (kgCO₂e/MWh)' };
			return;
		}
		if (!dataManager?.processedCache) return;
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
		if (panelKind === 'market' && marketConfig) {
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
		if (panelKind === 'price' || panelKind === 'intensity') {
			chartStore.chartOptions.selectedCurveType = /** @type {any} */ (
				getIntervalSpec(displayInterval)?.curveType ?? 'straight'
			);
			return;
		}
		chartStore.chartOptions.baseUnit = isEnergyMetric
			? 'Wh'
			: panelKind === 'emissions'
				? 't'
				: 'W';
		chartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			isEnergyMetric || panelKind === 'emissions' ? 'step' : 'straight'
		);
	});

	// Memoises the slice + display aggregation so pan ticks within one native
	// sample reuse the previous rows array (stable reference → the seriesData
	// assignment below is a signal no-op on a hit).
	const visibleAggregation = createVisibleAggregation();

	// Intensity derivation memo, keyed on the aggregation result's identity so
	// aggregation memo hits stay signal no-ops for the store too.
	/** @type {any[] | null} */ let lastIntensitySource = null;
	/** @type {any[]} */ let lastIntensityRows = [];

	// Visible data + axis
	$effect(() => {
		const manager = dataManager;
		if (!chartStore || !manager?.processedCache) return;

		perfSpan('chart:viewport-effect', () => {
			const start = viewStart;
			const end = viewEnd;
			const currentDisplayInterval = displayInterval;
			const sums = sumsForDisplay;

			const visibleData = visibleAggregation(manager.processedCache, {
				viewStart: start,
				viewEnd: end,
				apiInterval: interval,
				displayInterval: currentDisplayInterval,
				ianaTimeZone,
				method: sums ? 'sum' : 'mean'
			});

			// The intensity line renders a ratio of the aggregated component
			// series — derived per display bucket, matching the facility charts.
			let renderData = visibleData;
			if (panelKind === 'intensity') {
				if (lastIntensitySource !== visibleData) {
					lastIntensitySource = visibleData;
					lastIntensityRows = deriveIntensityDisplayRows(visibleData);
				}
				renderData = lastIntensityRows;
			}

			chartStore.seriesData = renderData;
			chartStore.setXDomain(start, end);
			chartStore.setYDomain(undefined);

			applyFacilityTimeAxis(chartStore, {
				data: renderData,
				viewStart: start,
				viewEnd: end,
				ianaTimeZone,
				timeZone,
				isEnergy:
					(sums && !isIntensityMetric) || getIntervalSpec(displayInterval)?.curveType === 'step',
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
		const sums = sumsForDisplay;
		const manager = dataManager;
		const colours = { ...chartStore.seriesColours };
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
				method: sums ? 'sum' : 'mean'
			});
			callback({
				data: rows,
				seriesNames: meta.seriesNames,
				seriesLabels: meta.seriesLabels,
				seriesColours: colours
			});
		}, 300);

		return () => {
			if (tableDebounceTimer) clearTimeout(tableDebounceTimer);
		};
	});

	// Homepage-style nighttime shading, regenerated for the visible window. Only
	// meaningful against sub-daily power curves — daily-and-coarser grains clear
	// it rather than painting bands narrower than a data bucket.
	$effect(() => {
		if (!chartStore) return;
		if (!nightShading || !fineGrain) {
			chartStore.bgShadingData = [];
			return;
		}
		chartStore.bgShadingData = nighttimes(
			new Date(viewStart),
			new Date(viewEnd),
			timeZone || '+10:00'
		);
		chartStore.bgShadingFill = '#33333311';
	});

	let showLoadingOverlay = $derived(computeShowLoadingOverlay(dataManager, chartStore));

	// Report load completion once the in-flight fetch settles — `cacheStart` is a
	// stable "data was found" signal that survives panning.
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
