<script>
	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { createVisibleAggregation } from '$lib/components/charts/v2/display-aggregation.js';
	import { formatXAxis, applyFacilityTimeAxis } from '$lib/components/charts/v2/formatters.js';
	import { showLoadingOverlay as computeShowLoadingOverlay } from '$lib/components/charts/v2/chart-loading-state.js';
	import { createChartHost } from '$lib/components/charts/v2/chart-host.svelte.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { ianaFromOffset } from '$lib/components/charts/v2/network-time.js';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import { processFacilityComparison } from './process-facility-comparison.js';
	import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';

	/** @type {{ facilities: Array<{code:string,name:string,units?:any[]}>, networkId:'NEM'|'WEM', interval:string, metric:'power'|'energy', displayInterval:string, timeZone:string, dateStart:string, dateEnd:string, chartHeightPx?:number, title?:string, onloadcomplete?: (state:{hasData:boolean}) => void, onvisibledata?: (payload:{data:any[],seriesNames:string[],seriesLabels:Record<string,string>}) => void, onviewportchange?: (range:{start:number,end:number}) => void, onviewportsettle?: (range:{start:number,end:number}) => void }} */
	let {
		facilities,
		networkId,
		interval,
		metric,
		displayInterval,
		timeZone,
		dateStart,
		dateEnd,
		chartHeightPx = 320,
		title = 'Facility comparison',
		onloadcomplete,
		onvisibledata,
		onviewportchange,
		onviewportsettle
	} = $props();

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let facilityCodes = $derived(facilities.map((facility) => facility.code));
	let facilityKey = $derived(facilityCodes.join(','));

	const host = createChartHost({
		cacheKey: () => `facility-comparison:${facilityKey}`,
		interval: () => interval,
		metric: () => metric,
		seriesKey: () => facilityKey,
		stashScope: () => facilityKey,
		createManager: () =>
			new ChartDataManager({
				cacheKey: `facility-comparison:${facilityKey}`,
				networkTimezone: timeZone,
				interval,
				metric,
				seriesKey: facilityKey,
				processResponse: (response) =>
					processFacilityComparison(response, { metric, facilities, networkTimezone: timeZone }),
				buildFetchUrl: (params) => {
					params.set('network_id', networkId);
					for (const code of facilityCodes) params.append('facility_code', code);
					return `/api/facilities/compare?${params.toString()}`;
				}
			}),
		initialViewport: () => ({
			start: new Date(`${dateStart}T00:00:00${timeZone}`).getTime(),
			end: Math.min(new Date(`${dateEnd}T23:59:59${timeZone}`).getTime(), Date.now())
		}),
		fetchBufferMultiplier: () => (metric === 'energy' ? 3 : 1),
		minDateMs: () => EARLIEST_DATA_MS,
		fineViewportLimits: () => metric === 'power',
		onGestureStart: () => chartStore?.clearHover(),
		onviewportchange: (range) => onviewportchange?.(range),
		onviewportsettle: (range) => onviewportsettle?.(range)
	});

	let dataManager = $derived(host.dataManager);
	let viewStart = $derived(host.viewStart);
	let viewEnd = $derived(host.viewEnd);
	let isPanning = $derived(host.isPanning);

	let chartStore = $derived.by(() => {
		const chart = new ChartStore({
			key: Symbol('facility-comparison'),
			title,
			prefix: 'M',
			displayPrefix: 'M',
			baseUnit: metric === 'energy' ? 'Wh' : 'W',
			chartType: 'line',
			timeZone
		});
		chart.chartStyles.chartHeightPx = chartHeightPx;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.chartStyles.snapTicks = true;
		chart.hideDataOptions = true;
		chart.hideChartTypeOptions = true;
		chart.chartTooltips.showTotal = false;
		chart.formatTickX = (/** @type {any} */ value) => formatXAxis(value, ianaTimeZone);
		return chart;
	});

	$effect(() => {
		if (!dataManager?.processedCache) return;
		chartStore.seriesNames = dataManager.processedCache.seriesNames;
		chartStore.seriesColours = dataManager.processedCache.seriesColours;
		chartStore.seriesLabels = dataManager.processedCache.seriesLabels;
	});

	$effect(() => {
		chartStore.title = title;
		chartStore.chartStyles.chartHeightPx = chartHeightPx;
		chartStore.chartOptions.baseUnit = metric === 'energy' ? 'Wh' : 'W';
		chartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			getIntervalSpec(displayInterval)?.curveType ?? 'straight'
		);
	});

	const visibleAggregation = createVisibleAggregation();
	$effect(() => {
		const manager = dataManager;
		if (!manager?.processedCache) return;
		const rows = visibleAggregation(manager.processedCache, {
			viewStart,
			viewEnd,
			apiInterval: interval,
			displayInterval,
			ianaTimeZone,
			method: metric === 'energy' ? 'sum' : 'mean'
		});
		chartStore.seriesData = rows;
		chartStore.setXDomain(viewStart, viewEnd);
		chartStore.setYDomain(undefined);
		applyFacilityTimeAxis(chartStore, {
			data: rows,
			viewStart,
			viewEnd,
			ianaTimeZone,
			timeZone,
			isEnergy: metric === 'energy',
			displayInterval
		});
		onvisibledata?.({
			data: rows,
			seriesNames: manager.processedCache.seriesNames,
			seriesLabels: manager.processedCache.seriesLabels
		});
	});

	let showLoadingOverlay = $derived(computeShowLoadingOverlay(dataManager, chartStore));

	$effect(() => {
		if (!dataManager?.initialLoadComplete || dataManager.hasPendingFetch) return;
		onloadcomplete?.({ hasData: dataManager.cacheStart !== null });
	});

	/** @param {number} time @param {string} [key] */
	function handleHover(time, key) {
		if (!isPanning) chartStore.setHover(time, key);
	}

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
		showHeader={false}
		tooltipMode="strip"
		zoomMode="static"
		onzoomin={host.zoomIn}
		onzoomout={host.zoomOut}
		isAtMinZoom={host.isAtMinZoom}
		isAtMaxZoom={host.isAtMaxZoom}
		onhover={handleHover}
		onhoverend={() => chartStore.clearHover()}
		onfocus={(time) => chartStore.toggleFocus(time)}
		onpanstart={host.handlePanStart}
		onpan={host.handlePan}
		onpanend={host.handlePanEnd}
		onzoom={host.handleZoom}
		enablePan
		panZoomMode="tap-to-engage"
		viewDomain={null}
		loadingRanges={dataManager?.loadingRanges ?? []}
	/>
	{#if showLoadingOverlay}
		<div class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60">
			<span class="text-sm text-mid-warm-grey">Loading data…</span>
		</div>
	{/if}
</div>
