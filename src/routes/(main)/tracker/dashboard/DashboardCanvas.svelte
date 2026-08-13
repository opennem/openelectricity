<script>
	import { onMount, tick, untrack } from 'svelte';
	import { Maximize2 } from '@lucide/svelte';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { ChartRangeBar, formatDateRange, toolbarTrayClass } from '$lib/components/charts/v2';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import { MIN_DATE } from '$lib/utils/date-range.js';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import InterconnectorChart from '$lib/components/charts/flows/InterconnectorChart.svelte';
	import { createNetworkMarketData } from '$lib/components/charts/network/network-market-data.svelte.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { INTERCONNECTORS, interconnectorsForRegion } from '$lib/flows/region-geo.js';
	import { NETWORK_METRIC_KEYS } from '$lib/components/charts/network/network-metric-definitions.js';
	import { downloadCsv } from '$lib/utils/download-csv.js';
	import MapKey from '$lib/components/map/MapKey.svelte';
	import MapOptionsDropdown from '$lib/components/map/MapOptionsDropdown.svelte';
	import { allBandsVisible } from '$lib/facilities/transmission-bands.js';
	import { hasSpotPrice, isWholeNetworkScope } from '../tracker-regions.js';
	import RegionDropdown from '../RegionDropdown.svelte';
	import NetworkMetrics from '../NetworkMetrics.svelte';
	import PriceChipRow from '../PriceChipRow.svelte';
	import PanelFrame from './PanelFrame.svelte';
	import GenerationBreakdown from './GenerationBreakdown.svelte';
	import { SINGLETON_PANEL_TYPES, normaliseRange } from './dashboard-model.js';
	import { buildLongDashboardCsv, buildWidePanelCsv, csvFilenameSlug } from './dashboard-csv.js';

	/** @type {{ region: string, group: 'detailed'|'simple', panels: any[], initialRange: any, initialNowMs?: number, editing?: boolean, flows?: Record<string,number>, prices?: Record<string,number>, dispatchDateTimeString?: string, onregionchange?: (region:string) => void, ongroupchange?: (group:'detailed'|'simple') => void, onrangechange?: (range:any) => void, onpanelsettingschange?: (id:string, settings:Record<string,unknown>) => void, onmove?: (id:string, direction:-1|1) => void, onduplicate?: (id:string) => void, onremove?: (id:string) => void, onresize?: (id:string,size:any) => void, onreorder?: (source:string,target:string) => void }} */
	let {
		region,
		group,
		panels,
		initialRange,
		initialNowMs,
		editing = false,
		flows = {},
		prices = {},
		dispatchDateTimeString = '',
		onregionchange,
		ongroupchange,
		onrangechange,
		onpanelsettingschange,
		onmove,
		onduplicate,
		onremove,
		onresize,
		onreorder
	} = $props();

	const DAY_MS = 86_400_000;
	const INITIAL_RANGE_DAYS = 7;
	const MAP_METRIC_OPTIONS = [
		{ label: 'Generation', value: 'power' },
		{ label: 'Price', value: 'price' },
		{ label: 'Emissions', value: 'emissions' }
	];
	const initialAnchor = untrack(() =>
		Number.isFinite(initialNowMs) ? /** @type {number} */ (initialNowMs) : Date.now()
	);
	let anchorEnd = $state(initialAnchor);
	let anchorStart = $derived(anchorEnd - INITIAL_RANGE_DAYS * DAY_MS);
	let network = $derived(regionToNetwork(region));
	let timeZone = $derived(network.timeZone);
	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let dateStart = $derived(
		toNetworkDateString(initialAnchor - INITIAL_RANGE_DAYS * DAY_MS, timeZone)
	);
	let dateEnd = $derived(toNetworkDateString(initialAnchor, timeZone));
	let viewStart = $state(0);
	let viewEnd = $state(0);

	/** @type {Record<string, any>} */
	let chartRefs = $state({});
	/** @type {Record<string, any>} */
	let visibleDatasets = $state.raw({});
	/** @type {number | undefined} */
	let hoverTime = $state(undefined);
	let panZoomEngaged = $state(false);
	let mapMaximised = $state('');
	let bandVisibility = $state(allBandsVisible());
	let maximisedMapSettings = $derived(
		panels.find((panel) => panel.instanceId === mapMaximised)?.settings ?? {}
	);
	let draggedPanelId = '';

	const range = createChartRangeControl({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		defaultViewport: () => ({ start: anchorStart, end: anchorEnd }),
		setViewport: (start, end) => {
			viewStart = start;
			viewEnd = end;
		},
		charts: () => [marketData, ...Object.values(chartRefs)],
		timeZone: () => timeZone,
		initialRangeDays: INITIAL_RANGE_DAYS
	});

	const marketData = createNetworkMarketData({
		region: () => region,
		basis: () => range.activeMetric,
		interval: () => range.activeInterval,
		timeZone: () => timeZone
	});

	let activeRange = $derived(
		range.selectedRange == null
			? normaliseRange({
					kind: 'custom',
					startMs: viewStart,
					endMs: viewEnd,
					intervalId: range.displayInterval
				})
			: normaliseRange({
					kind: 'preset',
					days: range.selectedRange,
					intervalId: range.displayInterval
				})
	);
	let rangeLabel = $derived(
		formatDateRange(
			new Date(viewStart || anchorStart),
			new Date(viewEnd || anchorEnd),
			ianaTimeZone,
			{
				yearIfNotCurrent: true
			}
		)
	);
	/** @param {'compact'|'standard'|'tall'} height */
	let chartHeight = (height) => ({ compact: 130, standard: 230, tall: 340 })[height];
	let generationMetric = $derived(range.activeMetric);
	let energyMetric = $derived(range.activeMetric === 'energy');
	let flowMetric = $derived(energyMetric ? 'flows_energy' : 'flows');
	let demandMetric = $derived(
		/** @type {'demand'|'demand_energy'} */ (energyMetric ? 'demand_energy' : 'demand')
	);
	let curtailmentMetric = $derived(
		/** @type {'curtailment'|'curtailment_energy'} */ (
			energyMetric ? 'curtailment_energy' : 'curtailment'
		)
	);
	let typedFlowMetric = $derived(/** @type {'flows'|'flows_energy'} */ (flowMetric));

	let regionInterconnectors = $derived(
		region === 'wem'
			? []
			: isWholeNetworkScope(region)
				? INTERCONNECTORS
				: interconnectorsForRegion(region.toUpperCase())
	);

	let generationDataset = $derived(
		Object.values(visibleDatasets).find((dataset) => dataset.type === 'generation') ?? null
	);
	let priceDataset = $derived(
		Object.values(visibleDatasets).find((dataset) => dataset.type === 'price') ?? null
	);

	/** @param {string} key @param {string} title @param {string} type @param {string} metric @param {any} payload */
	function setVisibleData(key, title, type, metric, payload) {
		visibleDatasets = { ...visibleDatasets, [key]: { key, title, type, metric, ...payload } };
		range.settle();
	}

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	/** @param {{start:number,end:number}} next @param {any} chart */
	function handleViewportChange(next, chart) {
		range.handleDerivedViewportChange(next, chart);
	}

	let lastDispatch = '';
	$effect(() => {
		const dispatch = dispatchDateTimeString;
		if (!dispatch || dispatch === lastDispatch) return;
		const first = !lastDispatch;
		lastDispatch = dispatch;
		if (first) return;
		untrack(() => {
			const nextEnd = Date.now();
			range.advanceLiveEdge(nextEnd);
			anchorEnd = nextEnd;
		});
	});

	$effect(() => {
		if (!viewStart || !viewEnd) return;
		const snapshot = activeRange;
		const timer = setTimeout(() => onrangechange?.(snapshot), 300);
		return () => clearTimeout(timer);
	});

	/** @param {any} snapshot */
	export async function applyRangeSnapshot(snapshot) {
		const next = normaliseRange(snapshot);
		if (next.kind === 'preset') range.handleRangeSelect(next.days);
		else {
			range.handleDateRangeChange({
				start: new Date(next.startMs).toISOString(),
				end: new Date(next.endMs).toISOString()
			});
		}
		if (next.intervalId !== range.displayInterval) range.handleIntervalChange(next.intervalId);
		await tick();
	}

	export function getRangeSnapshot() {
		return activeRange;
	}

	export function exportCsv(viewName = 'Tracker dashboard') {
		const datasets = Object.values(visibleDatasets)
			.filter((dataset) =>
				panels.some(
					(panel) =>
						dataset.key === panel.instanceId || dataset.key.startsWith(`${panel.instanceId}:`)
				)
			)
			.map((dataset) => {
				const panel = panels.find((candidate) => candidate.instanceId === dataset.key);
				const hidden = Array.isArray(panel?.settings.hiddenSeries)
					? panel.settings.hiddenSeries
					: [];
				return {
					...dataset,
					seriesNames: dataset.seriesNames.filter(
						(/** @type {string} */ series) => !hidden.includes(series)
					)
				};
			});
		const slug = csvFilenameSlug(viewName);
		const longCsv = buildLongDashboardCsv(datasets, timeZone);
		if (longCsv) downloadCsv(longCsv, `${slug}-all-panels.csv`);
		for (const dataset of datasets) {
			const csv = buildWidePanelCsv(dataset, timeZone);
			if (csv) downloadCsv(csv, `${slug}-${csvFilenameSlug(dataset.title)}.csv`);
		}
		return datasets.length;
	}

	onMount(() => {
		applyRangeSnapshot(initialRange);
	});

	/** @param {any} panel @param {string} key @param {unknown} value */
	function updateSetting(panel, key, value) {
		onpanelsettingschange?.(panel.instanceId, { ...panel.settings, [key]: value });
	}

	/** @param {any} panel @param {string} series */
	function toggleHiddenSeries(panel, series) {
		const current = Array.isArray(panel.settings.hiddenSeries) ? panel.settings.hiddenSeries : [];
		updateSetting(
			panel,
			'hiddenSeries',
			current.includes(series)
				? current.filter((/** @type {string} */ item) => item !== series)
				: [...current, series]
		);
	}

	/** @param {any} panel */
	function panelTitle(panel) {
		return /** @type {Record<string,string>} */ ({
			metrics: 'System metrics',
			generation: 'Generation mix',
			price: 'Price',
			emissions: 'Emissions',
			demand: 'Demand',
			curtailment: 'Curtailment',
			flows: 'Interconnector flows',
			map: 'Live map'
		})[panel.type];
	}

	/** @param {string} targetId */
	function handleDrop(targetId) {
		if (draggedPanelId && draggedPanelId !== targetId) onreorder?.(draggedPanelId, targetId);
		draggedPanelId = '';
	}
</script>

<div class="sticky top-0 z-30 border-b border-warm-grey bg-white/95 backdrop-blur-sm">
	<div class="{toolbarTrayClass} px-4 py-3 md:px-8">
		<div class="mx-auto flex w-full max-w-[1600px] flex-wrap items-end gap-x-8 gap-y-3">
			<div class="min-w-[180px]">
				<span
					class="mb-1.5 block font-space text-xxs font-medium uppercase tracking-wider text-mid-grey"
					>Region</span
				>
				<RegionDropdown selected={region} compact onchange={(value) => onregionchange?.(value)} />
			</div>
			<div class="min-w-0 flex-1 basis-[520px]">
				<div class="mb-1.5 flex items-baseline gap-3">
					<span class="font-space text-xxs font-medium uppercase tracking-wider text-mid-grey"
						>Range and interval</span
					>
					<span class="hidden text-xs text-mid-grey lg:inline">{rangeLabel}</span>
				</div>
				<div class="max-w-full overflow-x-auto pb-0.5">
					<ChartRangeBar
						selectedRange={range.selectedRange}
						customDays={range.customDays}
						displayInterval={range.displayInterval}
						startDate={range.pickerStartDate}
						endDate={range.pickerEndDate}
						minDate={MIN_DATE}
						maxDate={range.maxDate}
						showIntervalDropdown
						compact
						raised
						pending={range.rangeSwitchPending}
						onrangeselect={range.handleRangeSelect}
						ondaterangechange={range.handleDateRangeChange}
						onintervalchange={range.handleIntervalChange}
					/>
				</div>
			</div>
			<div class="shrink-0">
				<span
					class="mb-1.5 block font-space text-xxs font-medium uppercase tracking-wider text-mid-grey"
					>Grouping</span
				>
				<SwitchTabs
					buttons={[
						{ label: 'Detailed', value: 'detailed' },
						{ label: 'Simplified', value: 'simple' }
					]}
					selected={group}
					onChange={(value) => ongroupchange?.(/** @type {'detailed' | 'simple'} */ (value))}
				/>
			</div>
		</div>
	</div>
</div>

<div
	class="min-h-full bg-light-warm-grey p-4 md:p-8"
	use:clickoutside={{ event: 'pointerdown', options: true }}
	onclickoutside={() => (panZoomEngaged = false)}
>
	<div class="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 md:grid-cols-12 md:gap-8">
		{#each panels as panel, index (panel.instanceId)}
			<PanelFrame
				{panel}
				title={panelTitle(panel)}
				{editing}
				canDuplicate={!SINGLETON_PANEL_TYPES.has(panel.type)}
				{index}
				count={panels.length}
				onmove={(direction) => onmove?.(panel.instanceId, direction)}
				onduplicate={() => onduplicate?.(panel.instanceId)}
				onremove={() => onremove?.(panel.instanceId)}
				onresize={(size) => onresize?.(panel.instanceId, size)}
				ondragstart={() => (draggedPanelId = panel.instanceId)}
				ondrop={(event) => {
					event.preventDefault();
					handleDrop(panel.instanceId);
				}}
			>
				{#snippet actions()}
					{#if panel.type === 'generation'}
						<span class="rounded bg-light-warm-grey px-2 py-1 font-mono text-xxs text-mid-grey">
							{getIntervalSpec(range.displayInterval)?.label ?? range.displayInterval}
						</span>
					{:else if panel.type === 'emissions'}
						<SwitchTabs
							buttons={[
								{ label: 'Volume', value: 'volume' },
								{ label: 'Intensity', value: 'intensity' }
							]}
							selected={panel.settings.mode === 'intensity' ? 'intensity' : 'volume'}
							onChange={(value) => updateSetting(panel, 'mode', value)}
						/>
					{:else if panel.type === 'map'}
						<button
							type="button"
							onclick={() => (mapMaximised = panel.instanceId)}
							class="flex items-center gap-1 rounded-lg px-2 py-1 font-space text-xs text-mid-grey hover:bg-warm-grey hover:text-dark-grey"
							><Maximize2 class="size-3.5" /> Maximise</button
						>
					{/if}
				{/snippet}

				{#if panel.type === 'metrics'}
					<div class="border-b border-mid-warm-grey/40">
						<NetworkMetrics
							generationData={generationDataset}
							priceData={priceDataset}
							marketProvider={marketData}
							{viewStart}
							{viewEnd}
							basis={range.activeMetric}
							displayInterval={range.displayInterval}
							{timeZone}
							metricKeys={hasSpotPrice(region)
								? NETWORK_METRIC_KEYS
								: NETWORK_METRIC_KEYS.filter((key) => key !== 'avgPrice')}
							onpeakhighlight={handleHoverChange}
						/>
					</div>
					<PriceChipRow {prices} {dispatchDateTimeString} class="px-4 py-2" />
					<p class="m-0 border-t border-mid-warm-grey/40 px-4 py-2 text-[11px] text-mid-grey">
						Whole-system KPIs are independent of fuel-technology visibility.
					</p>
				{:else if panel.type === 'generation'}
					<div
						class="grid md:grid-cols-[minmax(0,1fr)_300px]"
						style="min-height: {chartHeight(panel.height) + 40}px"
					>
						<div class="min-w-0 p-2">
							<NetworkChart
								bind:this={chartRefs[panel.instanceId]}
								{region}
								metric={generationMetric}
								interval={range.activeInterval}
								displayInterval={range.displayInterval}
								{group}
								chartKind="stacked"
								nightShading
								{timeZone}
								{dateStart}
								{dateEnd}
								title={energyMetric ? 'Energy' : 'Power'}
								chartHeightPx={chartHeight(panel.height)}
								showContainer={false}
								tooltipMode="strip"
								hiddenSeriesNames={Array.isArray(panel.settings.hiddenSeries)
									? panel.settings.hiddenSeries
									: []}
								{hoverTime}
								onhoverchange={handleHoverChange}
								onviewportchange={(next) => handleViewportChange(next, chartRefs[panel.instanceId])}
								onviewportsettle={range.handleViewportSettle}
								onvisibledata={(payload) =>
									setVisibleData(
										panel.instanceId,
										panelTitle(panel),
										panel.type,
										generationMetric,
										payload
									)}
								onloadcomplete={() => range.settle()}
								panZoomMode="tap-to-engage"
								bind:panZoomEngaged
							/>
						</div>
						<GenerationBreakdown
							dataset={visibleDatasets[panel.instanceId]}
							hiddenSeries={Array.isArray(panel.settings.hiddenSeries)
								? panel.settings.hiddenSeries
								: []}
							metric={generationMetric}
							ontoggle={(series) => toggleHiddenSeries(panel, series)}
						/>
					</div>
				{:else if panel.type === 'price'}
					{#if !hasSpotPrice(region)}
						<div
							class="flex h-44 items-center justify-center p-6 text-center text-sm text-mid-grey"
						>
							There is no national All Australia spot price. Choose the NEM, WEM or an individual
							region.
						</div>
					{:else}
						<div class="p-2">
							<NetworkChart
								bind:this={chartRefs[panel.instanceId]}
								{region}
								metric="price"
								interval={range.activeInterval}
								displayInterval={range.displayInterval}
								chartKind="line"
								{timeZone}
								{dateStart}
								{dateEnd}
								title="Spot price"
								chartHeightPx={chartHeight(panel.height)}
								showContainer={false}
								tooltipMode="strip"
								{hoverTime}
								onhoverchange={handleHoverChange}
								onviewportchange={(next) => handleViewportChange(next, chartRefs[panel.instanceId])}
								onviewportsettle={range.handleViewportSettle}
								onvisibledata={(payload) =>
									setVisibleData(panel.instanceId, panelTitle(panel), panel.type, 'price', payload)}
								onloadcomplete={() => range.settle()}
								panZoomMode="tap-to-engage"
								bind:panZoomEngaged
							/>
						</div>
					{/if}
				{:else if panel.type === 'emissions'}
					{@const emissionsMetric =
						panel.settings.mode === 'intensity' ? 'emissions_intensity' : 'emissions'}
					<div class="p-2">
						<NetworkChart
							bind:this={chartRefs[panel.instanceId]}
							{region}
							metric={emissionsMetric}
							interval={range.activeInterval}
							displayInterval={range.displayInterval}
							{group}
							chartKind={panel.settings.mode === 'intensity' ? 'line' : 'stacked'}
							{timeZone}
							{dateStart}
							{dateEnd}
							title={panel.settings.mode === 'intensity' ? 'Intensity' : 'Volume'}
							chartHeightPx={chartHeight(panel.height)}
							showContainer={false}
							tooltipMode="strip"
							{hoverTime}
							onhoverchange={handleHoverChange}
							onviewportchange={(next) => handleViewportChange(next, chartRefs[panel.instanceId])}
							onviewportsettle={range.handleViewportSettle}
							onvisibledata={(payload) =>
								setVisibleData(
									panel.instanceId,
									panelTitle(panel),
									panel.type,
									emissionsMetric,
									payload
								)}
							onloadcomplete={() => range.settle()}
							panZoomMode="tap-to-engage"
							bind:panZoomEngaged
						/>
					</div>
				{:else if panel.type === 'demand'}
					<div class="p-2">
						<NetworkChart
							bind:this={chartRefs[panel.instanceId]}
							{region}
							metric={demandMetric}
							interval={range.activeInterval}
							displayInterval={range.displayInterval}
							chartKind="line"
							{timeZone}
							{dateStart}
							{dateEnd}
							title="Demand"
							chartHeightPx={chartHeight(panel.height)}
							showContainer={false}
							tooltipMode="strip"
							{hoverTime}
							onhoverchange={handleHoverChange}
							onviewportchange={(next) => handleViewportChange(next, chartRefs[panel.instanceId])}
							onviewportsettle={range.handleViewportSettle}
							onvisibledata={(payload) =>
								setVisibleData(
									panel.instanceId,
									panelTitle(panel),
									panel.type,
									demandMetric,
									payload
								)}
							onloadcomplete={() => range.settle()}
							panZoomMode="tap-to-engage"
							bind:panZoomEngaged
						/>
					</div>
				{:else if panel.type === 'curtailment'}
					{#if region === 'wem'}
						<div
							class="flex h-44 items-center justify-center p-6 text-center text-sm text-mid-grey"
						>
							Curtailment data is not available for the WEM.
						</div>
					{:else}
						<div class="p-2">
							<NetworkChart
								bind:this={chartRefs[panel.instanceId]}
								{region}
								metric={curtailmentMetric}
								interval={range.activeInterval}
								displayInterval={range.displayInterval}
								chartKind="stacked"
								{timeZone}
								{dateStart}
								{dateEnd}
								title="Wind and solar curtailment"
								chartHeightPx={chartHeight(panel.height)}
								showContainer={false}
								tooltipMode="strip"
								{hoverTime}
								onhoverchange={handleHoverChange}
								onviewportchange={(next) => handleViewportChange(next, chartRefs[panel.instanceId])}
								onviewportsettle={range.handleViewportSettle}
								onvisibledata={(payload) =>
									setVisibleData(
										panel.instanceId,
										panelTitle(panel),
										panel.type,
										curtailmentMetric,
										payload
									)}
								onloadcomplete={() => range.settle()}
								panZoomMode="tap-to-engage"
								bind:panZoomEngaged
							/>
						</div>
					{/if}
				{:else if panel.type === 'flows'}
					{#if region === 'wem'}
						<div
							class="flex h-44 items-center justify-center p-6 text-center text-sm text-mid-grey"
						>
							NEM interconnector data is not available for the WEM.
						</div>
					{:else}
						<div class="grid gap-4 p-4 {panel.width === 'full' ? 'md:grid-cols-2' : ''}">
							{#each regionInterconnectors as interconnector (interconnector.key)}
								<div class="min-w-0 rounded-lg border border-mid-warm-grey/40 p-2">
									<InterconnectorChart
										bind:this={chartRefs[`${panel.instanceId}:${interconnector.key}`]}
										interconnectorKey={interconnector.key}
										metric={typedFlowMetric}
										interval={range.activeInterval}
										displayInterval={range.displayInterval}
										{dateStart}
										{dateEnd}
										title={interconnector.label}
										chartHeightPx={Math.max(130, chartHeight(panel.height) / 2)}
										tooltipMode="strip"
										{hoverTime}
										onhoverchange={handleHoverChange}
										onviewportchange={(next) =>
											handleViewportChange(
												next,
												chartRefs[`${panel.instanceId}:${interconnector.key}`]
											)}
										onviewportsettle={range.handleViewportSettle}
										onvisibledata={(payload) =>
											setVisibleData(
												`${panel.instanceId}:${interconnector.key}`,
												interconnector.label,
												panel.type,
												typedFlowMetric,
												payload
											)}
										panZoomMode="tap-to-engage"
										bind:panZoomEngaged
									/>
								</div>
							{/each}
						</div>
					{/if}
				{:else if panel.type === 'map'}
					<div class="relative" style="height: {chartHeight(panel.height) + 120}px">
						{#await import('../Map.svelte') then { default: TrackerMap }}
							<TrackerMap
								mapTheme={panel.settings.theme === 'light' || panel.settings.theme === 'satellite'
									? panel.settings.theme
									: 'dark'}
								showTransmissionLines={panel.settings.transmission === true}
								transmissionLineVisibility={bandVisibility}
								showFlows={panel.settings.flows !== false}
								{flows}
								{prices}
								selectedRegion={region}
								selectedInterconnector={null}
								cooperativeGestures
							/>
						{/await}
						{#if panel.settings.legend === true}
							<div class="absolute bottom-16 right-3 z-10 hidden tablet:block">
								<MapKey
									showTransmission={panel.settings.transmission === true}
									mapTheme={panel.settings.theme === 'light' || panel.settings.theme === 'satellite'
										? panel.settings.theme
										: 'dark'}
									visibility={bandVisibility}
									onvisibilitychange={(value) => (bandVisibility = value)}
								/>
							</div>
						{/if}
						<div
							class="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-3 rounded-lg border border-mid-warm-grey bg-white/95 px-4 py-3 font-space text-xs text-dark-grey shadow-md backdrop-blur-sm"
						>
							<strong class="font-space">Live data</strong><span
								>Current dispatch flows and prices · {dispatchDateTimeString || 'loading'}</span
							>
							<div class="ml-auto flex items-center gap-1">
								<span>Metric</span>
								<div class="rounded-md border border-mid-warm-grey bg-white">
									<FormSelect
										selected={panel.settings.metric ?? 'power'}
										options={MAP_METRIC_OPTIONS}
										onchange={(option) => updateSetting(panel, 'metric', option.value)}
										compact
										widthClass="w-auto"
									/>
								</div>
							</div>
							<MapOptionsDropdown
								mapTheme={panel.settings.theme === 'light' || panel.settings.theme === 'satellite'
									? panel.settings.theme
									: 'dark'}
								showTransmissionLines={panel.settings.transmission === true}
								showFlows={panel.settings.flows !== false}
								showFlowsOption
								showLegend={panel.settings.legend === true}
								showClusteringOption={false}
								onmapthemechange={(value) => updateSetting(panel, 'theme', value)}
								ontransmissionlineschange={(value) => updateSetting(panel, 'transmission', value)}
								onflowschange={(value) => updateSetting(panel, 'flows', value)}
								onshowlegendchange={(value) => updateSetting(panel, 'legend', value)}
							/>
						</div>
					</div>
				{/if}
			</PanelFrame>
		{/each}
	</div>
</div>

{#if mapMaximised}
	<div
		class="fixed inset-0 z-50 bg-black/80 p-3 md:p-8"
		role="dialog"
		aria-modal="true"
		aria-label="Maximised live map"
	>
		<div class="relative h-full overflow-hidden rounded-lg border border-mid-warm-grey bg-white">
			<button
				type="button"
				onclick={() => (mapMaximised = '')}
				class="absolute right-4 top-4 z-20 rounded-lg border border-mid-warm-grey bg-white px-4 py-2 font-space text-sm font-medium shadow-md hover:bg-warm-grey"
				>Close map</button
			>
			{#await import('../Map.svelte') then { default: TrackerMap }}
				<TrackerMap
					mapTheme={maximisedMapSettings.theme === 'light' ||
					maximisedMapSettings.theme === 'satellite'
						? maximisedMapSettings.theme
						: 'dark'}
					showTransmissionLines={maximisedMapSettings.transmission === true}
					transmissionLineVisibility={bandVisibility}
					showFlows={maximisedMapSettings.flows !== false}
					{flows}
					{prices}
					selectedRegion={region}
					selectedInterconnector={null}
				/>
			{/await}
		</div>
	</div>
{/if}

<!-- Metrics remain complete in layouts without visible generation/price panels.
     These small off-screen chart hosts reuse the same controller and data path. -->
{#if panels.some((panel) => panel.type === 'metrics') && !panels.some((panel) => panel.type === 'generation')}
	<div
		class="pointer-events-none fixed -left-[10000px] top-0 h-[200px] w-[600px]"
		aria-hidden="true"
	>
		<NetworkChart
			bind:this={chartRefs['metrics:generation']}
			{region}
			metric={generationMetric}
			interval={range.activeInterval}
			displayInterval={range.displayInterval}
			{group}
			chartKind="stacked"
			{timeZone}
			{dateStart}
			{dateEnd}
			showContainer={false}
			showHeader={false}
			chartHeightPx={180}
			tooltipMode="none"
			onviewportchange={(next) => handleViewportChange(next, chartRefs['metrics:generation'])}
			onviewportsettle={range.handleViewportSettle}
			onvisibledata={(payload) =>
				setVisibleData(
					'metrics:generation',
					'Generation mix',
					'generation',
					generationMetric,
					payload
				)}
		/>
	</div>
{/if}
{#if panels.some((panel) => panel.type === 'metrics') && hasSpotPrice(region) && !panels.some((panel) => panel.type === 'price')}
	<div
		class="pointer-events-none fixed -left-[10000px] top-[210px] h-[200px] w-[600px]"
		aria-hidden="true"
	>
		<NetworkChart
			bind:this={chartRefs['metrics:price']}
			{region}
			metric="price"
			interval={range.activeInterval}
			displayInterval={range.displayInterval}
			chartKind="line"
			{timeZone}
			{dateStart}
			{dateEnd}
			showContainer={false}
			showHeader={false}
			chartHeightPx={180}
			tooltipMode="none"
			onviewportchange={(next) => handleViewportChange(next, chartRefs['metrics:price'])}
			onviewportsettle={range.handleViewportSettle}
			onvisibledata={(payload) =>
				setVisibleData('metrics:price', 'Price', 'price', 'price', payload)}
		/>
	</div>
{/if}
