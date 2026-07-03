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
	import { aggregateForDisplay } from '$lib/components/charts/v2/dataProcessing.js';
	import { formatXAxis, applyFacilityTimeAxis } from '$lib/components/charts/v2/formatters.js';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { processNetworkData } from './process-network-data.js';
	import { processPriceData } from '$lib/components/charts/facility/process-price-data.js';
	import { getGroup } from './groups.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { loadFuelTechs } from '$lib/fuel_techs';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { ianaFromOffset } from '../v2/network-time.js';

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
	 * @property {((tableData: {data: any[], seriesNames: string[], seriesLabels: Record<string, string>}) => void)} [onvisibledata]
	 * @property {'always' | 'tap-to-engage'} [panZoomMode]
	 * @property {boolean} [panZoomEngaged]
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
		onvisibledata,
		panZoomMode = /** @type {'always' | 'tap-to-engage'} */ ('always'),
		panZoomEngaged = $bindable(false)
	} = $props();

	const dollarFormatter = getNumberFormat(0);

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let isPriceKind = $derived(chartKind === 'line');
	let isEnergyMetric = $derived(metric === 'energy');

	/** Fine grain (sub-daily) drives the power-style viewport limits. */
	let fineGrain = $derived(interval === '5m' || interval === '1h');

	let MIN_VIEWPORT_MS = $derived(fineGrain ? 1 * 60 * 60 * 1000 : 5 * 24 * 60 * 60 * 1000);
	let MAX_VIEWPORT_MS = $derived(
		fineGrain ? 16 * 24 * 60 * 60 * 1000 : 50 * 365 * 24 * 60 * 60 * 1000
	);
	let fetchBufferMultiplier = $derived(fineGrain ? 1 : 3);

	// ============================================
	// Viewport state
	// ============================================

	/** @type {number} */
	let viewStart = $state(0);
	/** @type {number} */
	let viewEnd = $state(0);
	/** @type {number} */
	let lastPanDelta = $state(0);
	let isPanning = $state(false);

	// ============================================
	// Series processing config
	// ============================================

	let groupConfig = $derived(getGroup(group));

	/** @param {string} groupId */
	function getGroupColour(groupId) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (groupId)] || '#888888';
	}

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
			getColour: getGroupColour,
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

	$effect(() => {
		// Dependencies that require a fresh manager
		const currentRegion = region;
		const currentMetric = metric;
		const currentInterval = interval;
		const currentKind = chartKind;
		// `processResponseFn` already depends on `group` (via groupConfig), so a
		// group change recomputes it and re-runs this effect with a fresh manager.
		const processFn = processResponseFn;
		const urlFn = buildFetchUrl;

		const manager = new ChartDataManager({
			facilityCode: `${currentRegion}:${currentKind}`,
			networkId: timeZone === '+08:00' ? 'WEM' : 'NEM',
			interval: currentInterval,
			metric: currentMetric,
			unitFuelTechMap: {},
			processResponseFn: processFn,
			buildFetchUrl: urlFn,
			getLabel: () => '',
			getColour: () => ''
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
			manager.requestRange(vs - buffer, Math.min(ve + buffer, Date.now()), { immediate: true });
		}

		dataManager = manager;
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

	// Visible data + axis
	$effect(() => {
		if (!chartStore || !dataManager?.processedCache) return;

		const start = viewStart;
		const end = viewEnd;
		const currentDisplayInterval = displayInterval;
		const isEnergy = isEnergyMetric;

		let visibleData = dataManager.getDataForRange(start, end);
		if (dataManager.seriesMeta) {
			visibleData = aggregateForDisplay(visibleData, dataManager.seriesMeta.seriesNames, {
				apiInterval: interval,
				displayInterval: currentDisplayInterval,
				ianaTimeZone,
				method: isEnergy ? 'sum' : 'mean'
			});
		}

		chartStore.seriesData = visibleData;
		chartStore.xDomain = /** @type {[number, number]} */ ([start, end]);
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
			const rows = aggregateForDisplay(manager.getDataForRange(start, end), meta.seriesNames, {
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

	let showLoadingOverlay = $derived.by(() => {
		if (!dataManager || !chartStore) return false;
		if (chartStore.seriesData.length > 0) return false;
		return !dataManager.initialLoadComplete || dataManager.isLoading || dataManager.hasPendingFetch;
	});

	// ============================================
	// Pan / zoom
	// ============================================

	function handlePanStart() {
		isPanning = true;
		chartStore?.clearHover();
	}

	/** @param {number} deltaMs */
	function handlePan(deltaMs) {
		let newStart = viewStart - deltaMs;
		let newEnd = viewEnd - deltaMs;
		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - (viewEnd - viewStart);
		}
		viewStart = newStart;
		viewEnd = newEnd;
		lastPanDelta = deltaMs;
		const buffer = (viewEnd - viewStart) * fetchBufferMultiplier;
		dataManager?.requestRange(viewStart - buffer, viewEnd + buffer);
	}

	function handlePanEnd() {
		isPanning = false;
		const prefetch = (viewEnd - viewStart) * fetchBufferMultiplier;
		const now = Date.now();
		if (lastPanDelta < 0 && viewEnd < now) {
			dataManager?.requestRange(viewEnd, Math.min(viewEnd + prefetch, now));
		} else if (lastPanDelta > 0) {
			dataManager?.requestRange(viewStart - prefetch, viewStart);
		}
	}

	$effect(() => {
		const start = viewStart;
		const end = viewEnd;
		if (!start || !end) return;
		onviewportchange?.({ start, end });
	});

	/** @param {number} factor @param {number} centerMs */
	function handleZoom(factor, centerMs) {
		const duration = viewEnd - viewStart;
		const newDuration = Math.min(Math.max(duration / factor, MIN_VIEWPORT_MS), MAX_VIEWPORT_MS);
		const ratio = (centerMs - viewStart) / duration;
		let newStart = centerMs - ratio * newDuration;
		let newEnd = newStart + newDuration;
		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - newDuration;
		}
		viewStart = newStart;
		viewEnd = newEnd;
		const buffer = newDuration * fetchBufferMultiplier;
		dataManager?.requestRange(viewStart - buffer, viewEnd + buffer);
	}

	const BUTTON_ZOOM_FACTOR = 1.5;
	function zoomIn() {
		handleZoom(BUTTON_ZOOM_FACTOR, (viewStart + viewEnd) / 2);
	}
	function zoomOut() {
		handleZoom(1 / BUTTON_ZOOM_FACTOR, (viewStart + viewEnd) / 2);
	}
	let isAtMinZoom = $derived(viewEnd - viewStart <= MIN_VIEWPORT_MS);
	let isAtMaxZoom = $derived(viewEnd - viewStart >= MAX_VIEWPORT_MS);

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
		viewStart = startMs;
		viewEnd = Math.min(endMs, now);
		if (dataManager && (dataManager.interval !== interval || dataManager.metric !== metric)) {
			return;
		}
		const duration = viewEnd - viewStart;
		const buffer = duration * fetchBufferMultiplier;
		dataManager?.requestRange(viewStart - buffer, Math.min(viewEnd + buffer, now));
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
