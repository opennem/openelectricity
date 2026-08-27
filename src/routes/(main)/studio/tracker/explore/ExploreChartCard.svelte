<script>
	import { MoreHorizontal, Pencil, Trash2 } from '@lucide/svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import FacilityChart from '$lib/components/charts/facility/FacilityChart.svelte';
	import FacilityComparisonChart from '$lib/components/charts/facility/FacilityComparisonChart.svelte';
	import MetricCard from '$lib/components/charts/facility/metrics/MetricCard.svelte';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import { MIN_DATE } from '$lib/utils/date-range.js';
	import { TRACKER_REGION_OPTIONS } from '../tracker-regions.js';
	import GenerationBreakdown from '../dashboard/GenerationBreakdown.svelte';
	import { recipeById } from './explore-model.js';
	import { computeExploreMetric } from './explore-metric.js';

	/** @type {{ chart:any, facilities:any[], heightPx?:number, selected?:boolean, readOnly?:boolean, sharedControls?:any, onedit?:()=>void, onremove?:()=>void, onviewportchange?:(range:{start:number,end:number})=>void, onviewportsettle?:(range:{start:number,end:number})=>void, ongenerationdata?:(payload:any)=>void, onloadcomplete?:()=>void }} */
	let {
		chart,
		facilities,
		heightPx = 420,
		selected = false,
		readOnly = false,
		sharedControls = null,
		onedit,
		onremove,
		onviewportchange,
		onviewportsettle,
		ongenerationdata,
		onloadcomplete
	} = $props();

	const DAY_MS = 86_400_000;
	const anchorEnd = Date.now();
	let recipe = $derived(recipeById(chart.recipeId));
	let config = $derived(chart.config);
	let shared = $derived(Boolean(sharedControls));
	let isMetric = $derived(config.presentation === 'metric');
	let unavailableErrors = $derived(chart.unavailableErrors ?? []);
	let chartHeightPx = $derived(Math.max(180, heightPx - 30));
	let displayInterval = $derived(shared ? sharedControls.displayInterval : config.range.intervalId);
	let intervalSpec = $derived(getIntervalSpec(displayInterval));
	let metricBasis = $derived(shared ? sharedControls.metric : (intervalSpec?.metric ?? 'power'));
	let apiInterval = $derived(
		shared ? sharedControls.interval : (intervalSpec?.apiInterval ?? '5m')
	);
	let effectiveScope = $derived(
		shared && !chart.recipeId.startsWith('facility') ? sharedControls.scope : config.scope
	);
	let effectiveGroup = $derived(shared ? sharedControls.group : config.group);
	let network = $derived(
		chart.recipeId.startsWith('facility')
			? { networkId: config.networkId, timeZone: config.networkId === 'WEM' ? '+08:00' : '+10:00' }
			: regionToNetwork(effectiveScope)
	);
	let timeZone = $derived(network.timeZone);
	let rangeStart = $derived(
		shared
			? sharedControls.startMs
			: config.range.days === -1
				? new Date(MIN_DATE).getTime()
				: anchorEnd - config.range.days * DAY_MS
	);
	let rangeEnd = $derived(shared ? sharedControls.endMs : anchorEnd);
	let dateStart = $derived(toNetworkDateString(rangeStart, timeZone));
	let dateEnd = $derived(toNetworkDateString(rangeEnd, timeZone));
	let selectedFacilities = $derived(
		facilities.filter((facility) => config.facilityCodes?.includes(facility.code))
	);
	let selectedFacility = $derived(selectedFacilities[0] ?? null);
	let hiddenUnits = $derived(
		selectedFacility && config.unitCodes?.length
			? selectedFacility.units
					.map((/** @type {any} */ unit) => unit.code)
					.filter((/** @type {string} */ code) => !config.unitCodes.includes(code))
			: []
	);

	/** @type {any} */
	let generationDataset = $state.raw(null);
	/** @type {string[]} */
	let hiddenSeries = $state([]);
	let filteredFuelSeries = $derived(
		chart.recipeId === 'generation' ||
			chart.recipeId === 'market-value' ||
			(chart.recipeId === 'emissions' && config.emissionsMode === 'volume')
	);
	let sharedHiddenSeries = $derived(
		shared && Array.isArray(sharedControls.hiddenFuelTechGroups)
			? sharedControls.hiddenFuelTechGroups
			: []
	);
	let effectiveHiddenSeries = $derived(
		shared && filteredFuelSeries ? sharedHiddenSeries : hiddenSeries
	);
	let hasSettled = $state(false);
	let hasData = $state(false);
	/** @type {{data:any[],seriesNames:string[],seriesLabels?:Record<string,string>} | null} */
	let metricDataset = $state.raw(null);
	let actionsOpen = $state(false);

	let scopeLabel = $derived(
		chart.recipeId.startsWith('facility')
			? config.networkId
			: (TRACKER_REGION_OPTIONS.find((option) => option.value === effectiveScope)?.shortLabel ??
					effectiveScope)
	);

	/** @returns {any} */
	function resolveNetworkMetric() {
		switch (chart.recipeId) {
			case 'generation':
				return metricBasis;
			case 'demand':
				return `${config.demand === 'gross' ? 'demand_gross' : 'demand'}${metricBasis === 'energy' ? '_energy' : ''}`;
			case 'price':
				return 'price';
			case 'emissions':
				return config.emissionsMode === 'intensity' ? 'emissions_intensity' : 'emissions';
			case 'market-value':
				return 'market_value';
			case 'renewables':
				if (config.renewableMeasure === 'share') {
					if (isMetric) return metricBasis === 'energy' ? 'renewables_energy' : 'renewables';
					return config.includeStorage ? 'renewable_share_storage' : 'renewable_share';
				}
				return `renewable_generation${config.includeStorage ? '_storage' : ''}${metricBasis === 'energy' ? '_energy' : ''}`;
			case 'curtailment': {
				const source = config.curtailmentSource === 'total' ? '' : `_${config.curtailmentSource}`;
				return `curtailment${source}${metricBasis === 'energy' ? '_energy' : ''}`;
			}
			case 'flows':
				return metricBasis === 'energy' ? 'flows_energy' : 'flows';
			default:
				return metricBasis;
		}
	}

	let networkMetric = $derived(resolveNetworkMetric());

	let chartKind = $derived(
		/** @type {'line' | 'stacked'} */ (
			['price', 'demand', 'renewables'].includes(chart.recipeId) ||
			(chart.recipeId === 'emissions' && config.emissionsMode === 'intensity')
				? 'line'
				: 'stacked'
		)
	);
	let title = $derived(recipe?.label ?? 'Chart');
	let chartSubtitle = $derived(
		shared
			? `${scopeLabel} · ${sharedControls.rangeLabel} · ${intervalSpec?.label ?? displayInterval}`
			: `${scopeLabel} · ${config.range.days === -1 ? 'All data' : `${config.range.days}D`} · ${intervalSpec?.label ?? displayInterval}`
	);
	let metricResult = $derived(
		computeExploreMetric(
			chart.recipeId,
			{ ...config, scope: effectiveScope, group: effectiveGroup },
			metricDataset,
			metricBasis,
			shared && filteredFuelSeries ? sharedHiddenSeries : []
		)
	);
	let metricSubtitle = $derived(
		metricResult?.subtitle ? `${metricResult.subtitle} · ${chartSubtitle}` : chartSubtitle
	);

	/** @param {{hasData:boolean}} state */
	function handleLoadComplete(state) {
		hasSettled = true;
		hasData = state.hasData;
		onloadcomplete?.();
	}

	/** @param {{data:any[],seriesNames:string[],seriesLabels?:Record<string,string>}} payload */
	function handleVisibleData(payload) {
		metricDataset = payload;
		if (chart.recipeId === 'generation') {
			generationDataset = payload;
			ongenerationdata?.(payload);
		}
	}

	/** @param {string} series */
	function toggleSeries(series) {
		hiddenSeries = hiddenSeries.includes(series)
			? hiddenSeries.filter((item) => item !== series)
			: [...hiddenSeries, series];
	}

	/** @type {any} */
	let renderedChart = $state(null);

	/** @param {number} startMs @param {number} endMs */
	export function setViewport(startMs, endMs) {
		renderedChart?.setViewport?.(startMs, endMs);
	}

	export function reconcileFetches() {
		renderedChart?.reconcileFetches?.();
	}
</script>

<article
	class="overflow-hidden rounded-xl border bg-white shadow-sm transition {selected
		? 'border-dark-grey ring-1 ring-dark-grey/20'
		: 'border-mid-warm-grey'}"
>
	<header
		class="relative flex items-start justify-between gap-4 border-b border-warm-grey px-5 py-4"
	>
		<div class="min-w-0">
			<h2 class="m-0 text-base font-semibold text-dark-grey">{title}</h2>
			<p class="m-0 mt-1 truncate font-mono text-xxs text-mid-grey">{chartSubtitle}</p>
		</div>
		{#if !readOnly}<div
				class="relative shrink-0"
				onfocusout={(event) => {
					if (!event.currentTarget.contains(/** @type {Node|null} */ (event.relatedTarget))) {
						actionsOpen = false;
					}
				}}
			>
				<button
					type="button"
					class="rounded-lg p-2 text-mid-grey hover:bg-warm-grey hover:text-dark-grey"
					onclick={() => (actionsOpen = !actionsOpen)}
					aria-label={`Open actions for ${title}`}
					aria-expanded={actionsOpen}
				>
					<MoreHorizontal class="size-4" />
				</button>
				{#if actionsOpen}
					<div
						class="absolute right-0 top-10 z-30 w-36 overflow-hidden rounded-lg border border-warm-grey bg-white p-1 shadow-lg"
					>
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-dark-grey hover:bg-warm-grey"
							onclick={() => {
								actionsOpen = false;
								onedit?.();
							}}
						>
							<Pencil class="size-3.5" /> Configure
						</button>
						<button
							type="button"
							class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-red hover:bg-red/10"
							onclick={() => {
								actionsOpen = false;
								onremove?.();
							}}
						>
							<Trash2 class="size-3.5" /> Remove
						</button>
					</div>
				{/if}
			</div>{/if}
	</header>

	<div class="relative" style:min-height="{heightPx}px">
		{#if unavailableErrors.length}
			<div
				class="flex items-center justify-center px-8 text-center"
				style:min-height="{heightPx}px"
			>
				<div class="max-w-sm">
					<p class="m-0 text-sm font-semibold text-dark-grey">This data source is unavailable</p>
					<p class="m-0 mt-2 text-xs leading-relaxed text-mid-grey">
						The saved facility may have changed or is not in the current catalogue. Configure this
						card to choose a replacement.
					</p>
					{#if !readOnly}<button
							type="button"
							class="mt-4 rounded-lg bg-dark-grey px-3 py-2 text-xs font-semibold text-white"
							onclick={onedit}>Configure</button
						>{/if}
				</div>
			</div>
		{:else}
			{#if isMetric}
				<div
					class="flex items-center justify-center px-6 py-8 text-center"
					style:min-height="{heightPx}px"
				>
					{#if metricResult}
						<div
							class="min-w-[220px] rounded-xl border border-warm-grey bg-light-warm-grey/40 px-8 py-7 text-left"
						>
							<MetricCard
								label={metricResult.label}
								value={metricResult.value}
								unit={metricResult.unit}
								subtitle={metricSubtitle}
								size="lg"
							/>
						</div>
					{:else}
						<p class="m-0 text-sm text-mid-grey">Loading metric…</p>
					{/if}
				</div>
			{/if}

			<div
				class={isMetric ? 'pointer-events-none fixed -left-[10000px] top-0 w-[720px]' : ''}
				style:height={isMetric ? `${heightPx}px` : undefined}
				aria-hidden={isMetric ? 'true' : undefined}
			>
				{#if chart.recipeId === 'facility' && selectedFacility}
					<div class="p-3">
						<FacilityChart
							bind:this={renderedChart}
							facility={selectedFacility}
							powerData={null}
							{timeZone}
							interval={apiInterval}
							metric={metricBasis}
							{displayInterval}
							{dateStart}
							{dateEnd}
							title={selectedFacility.name}
							{chartHeightPx}
							showContainer={false}
							showHeader={false}
							showOptions={false}
							resizable={false}
							prefetchRanges={false}
							hiddenUnitCodes={hiddenUnits}
							onvisibledata={handleVisibleData}
							onloadcomplete={handleLoadComplete}
							{onviewportchange}
							{onviewportsettle}
						/>
					</div>
				{:else if chart.recipeId === 'facility-comparison'}
					<div class="p-3">
						<FacilityComparisonChart
							bind:this={renderedChart}
							facilities={selectedFacilities}
							networkId={config.networkId}
							interval={apiInterval}
							metric={metricBasis}
							{displayInterval}
							{timeZone}
							{dateStart}
							{dateEnd}
							{chartHeightPx}
							onloadcomplete={handleLoadComplete}
							onvisibledata={handleVisibleData}
							{onviewportchange}
							{onviewportsettle}
						/>
					</div>
				{:else if chart.recipeId === 'generation'}
					<div class={shared ? '' : 'grid md:grid-cols-[minmax(0,1fr)_300px]'}>
						<div class="min-w-0 p-3">
							<NetworkChart
								bind:this={renderedChart}
								region={effectiveScope}
								metric={networkMetric}
								interval={apiInterval}
								{displayInterval}
								group={effectiveGroup}
								chartKind="stacked"
								nightShading
								{timeZone}
								{dateStart}
								{dateEnd}
								{chartHeightPx}
								showContainer={false}
								showHeader={false}
								tooltipMode="strip"
								hiddenSeriesNames={effectiveHiddenSeries}
								onvisibledata={handleVisibleData}
								onloadcomplete={handleLoadComplete}
								{onviewportchange}
								{onviewportsettle}
								panZoomMode="tap-to-engage"
							/>
						</div>
						{#if !shared}
							<GenerationBreakdown
								dataset={generationDataset}
								{hiddenSeries}
								metric={metricBasis}
								ontoggle={toggleSeries}
							/>
						{/if}
					</div>
				{:else}
					<div class="p-3">
						<NetworkChart
							bind:this={renderedChart}
							region={effectiveScope}
							metric={networkMetric}
							interval={apiInterval}
							{displayInterval}
							group={effectiveGroup}
							{chartKind}
							useDivergingStack={chart.recipeId === 'flows'}
							{timeZone}
							{dateStart}
							{dateEnd}
							{chartHeightPx}
							showContainer={false}
							showHeader={false}
							tooltipMode="strip"
							hiddenSeriesNames={effectiveHiddenSeries}
							excludedFuelTechGroups={shared &&
							chart.recipeId === 'emissions' &&
							config.emissionsMode === 'intensity'
								? sharedHiddenSeries
								: []}
							onloadcomplete={handleLoadComplete}
							onvisibledata={handleVisibleData}
							{onviewportchange}
							{onviewportsettle}
							panZoomMode="tap-to-engage"
						/>
					</div>
				{/if}
			</div>

			{#if hasSettled && !hasData}
				<div class="absolute inset-0 flex items-center justify-center bg-white/90 p-8 text-center">
					<div>
						<p class="m-0 text-sm font-semibold text-dark-grey">No data for this configuration</p>
						<p class="m-0 mt-1 text-xs text-mid-grey">Try a wider range or a different scope.</p>
					</div>
				</div>
			{/if}
		{/if}
	</div>

	{#if chart.recipeId === 'renewables' && config.renewableMeasure === 'generation'}
		<footer class="border-t border-warm-grey px-5 py-3 text-xs leading-relaxed text-mid-grey">
			Renewable generation follows OpenElectricity’s official aggregate and includes rooftop solar.{config.includeStorage
				? ' The storage option uses the official with-storage aggregate.'
				: ''}
			<a
				href="https://docs.openelectricity.org.au/guides/renewables/"
				target="_blank"
				rel="noopener noreferrer"
				class="ml-1 underline hover:text-dark-grey">How it is calculated →</a
			>
		</footer>
	{/if}
</article>
