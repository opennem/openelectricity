<script>
	import { onMount, untrack } from 'svelte';
	import { clickoutside } from '@svelte-put/clickoutside';
	import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import { createResizeControl } from '$lib/components/ui/panel/resize-control.svelte.js';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import ResizablePanel from '$lib/components/ui/resizable-panel/resizable-panel.svelte';
	import { rangeSlugFor } from '$lib/components/charts/facility/range-params.js';
	import {
		getIntervalSpec,
		isRollingInterval
	} from '$lib/components/charts/facility/range-interval-config.js';
	import { getGroup } from '$lib/components/charts/network/groups.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import { hasSpotPrice, TRACKER_REGION_OPTIONS } from './tracker-regions.js';
	import ChartCard from './ChartCard.svelte';
	import FuelTechPanel from './FuelTechPanel.svelte';
	import { createTrackerPrefetchPlan } from './tracker-prefetch.js';
	import { resolvePriceMode } from './tracker-model.js';
	import {
		CURTAILMENT_SERIES,
		curtailmentOverlayFor,
		DEMAND_LINE_COLOUR,
		RENEWABLES_LINE_COLOUR
	} from './tracker-overlays.js';
	import { formatTrackerPercentageValue } from './table-format.js';
	import { createTrackerProviders } from './tracker-providers.svelte.js';
	import { createTrackerTable } from './tracker-table.svelte.js';
	import { createTrackerData } from './tracker-data.svelte.js';
	import { rollingShareRows, ROLLING_LEAD_MS } from './tracker-chart-overlays.js';

	/** @typedef {import('./types.js').TrackerOverlay} TrackerOverlay */
	/** @typedef {import('./types.js').GenerationSnapshot} GenerationSnapshot */
	/** @typedef {import('./types.js').TrackerExportContext} TrackerExportContext */
	/** @type {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>,
	 * contributionMode?: import('./types.js').ContributionMode}} */
	let { session, contributionMode = 'generation' } = $props();
	const range = untrack(() => session.range);
	let region = $derived(session.selection.region);
	let group = $derived(session.selection.group);
	let priceMode = $derived(session.selection.priceMode);
	let emissionsMode = $derived(session.selection.emissionsMode);
	let overlays = $derived(session.selection.overlays);
	let tablePanelOpen = $derived(session.selection.tablePanelOpen);
	let bucketFilter = $derived(session.selection.bucketFilter);
	let timeZone = $derived(regionToNetwork(region).timeZone);
	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let dateStart = $derived(toNetworkDateString(session.anchorStart, timeZone));
	let dateEnd = $derived(toNetworkDateString(session.anchorEnd, timeZone));
	let viewWindow = $derived(session.window);
	let rangeLabel = $derived(session.rangeLabel);
	let generationChart = $state.raw(/** @type {NetworkChart | undefined} */ (undefined));
	let priceChart = $state.raw(/** @type {NetworkChart | undefined} */ (undefined));
	let emissionsChart = $state.raw(/** @type {NetworkChart | undefined} */ (undefined));
	let generationDisplayPrefix = $derived(
		/** @type {SiPrefix} */ (generationChart?.getDisplayPrefix() ?? 'M')
	);
	let hoverTime = $state(/** @type {number | undefined} */ (undefined));
	let panZoomEngaged = $state(false);
	let hiddenState = $state.raw({ group: '', ids: /** @type {string[]} */ ([]) });
	let hiddenSeries = $derived(hiddenState.group === group ? hiddenState.ids : []);
	let regionHasSpotPrice = $derived(hasSpotPrice(region));
	let priceIsMarketValue = $derived(resolvePriceMode(region, priceMode) === 'market_value');
	let emissionsIsIntensity = $derived(emissionsMode === 'intensity');
	let energyMetric = $derived(range.activeMetric === 'energy');
	let isRollingDisplay = $derived(isRollingInterval(range.displayInterval));
	let intervalBadge = $derived(
		getIntervalSpec(range.displayInterval)?.label ?? range.displayInterval
	);
	let priceMetric = $derived(
		/** @type {'market_value' | 'price' | 'price_vw'} */ (
			priceIsMarketValue ? 'market_value' : isRollingDisplay ? 'price_vw' : 'price'
		)
	);
	let emissionsMetric = $derived(
		/** @type {'emissions_intensity' | 'emissions'} */ (
			emissionsIsIntensity ? 'emissions_intensity' : 'emissions'
		)
	);
	let showDemandLine = $derived(overlays.includes('demand'));
	let showRenewablesLine = $derived(overlays.includes('renewables'));
	let shownCurtailment = $derived(
		CURTAILMENT_SERIES.filter((series) => overlays.includes(series.overlay))
	);
	let shownCurtailmentIds = $derived(shownCurtailment.map((series) => series.id));
	/** @param {import('./types.js').PriceMode} value */
	const onpricemodechange = (value) => session.select('priceMode', value);
	/** @param {import('./types.js').EmissionsMode} value */
	const onemissionsmodechange = (value) => session.select('emissionsMode', value);
	/** @param {TrackerOverlay[]} value */
	const onoverlayschange = (value) => session.select('overlays', value, 'replace');
	/** @param {boolean} value */
	const onpaneltoggle = (value) => session.select('tablePanelOpen', value);
	const providers = createTrackerProviders({
		selection: () => session.selection,
		range,
		timeZone: () => timeZone
	});
	const { marketData, demandData, curtailmentData, shareData } = providers;
	const data = createTrackerData({
		session: untrack(() => session),
		priceMetric: () => priceMetric,
		emissionsMetric: () => emissionsMetric,
		hidden: () => hiddenSeries,
		charts: () => [generationChart, priceChart, emissionsChart]
	});
	const table = createTrackerTable({
		session: untrack(() => session),
		providers,
		generation: () => data.current('generation'),
		hidden: () => hiddenSeries,
		contribution: () => contributionMode,
		ianaTimeZone: () => ianaTimeZone
	});
	let displayRowOpts = $derived(table.displayRowOpts);
	let shareRowOpts = $derived(table.shareRowOpts);
	let tableRows = $derived(table.rows);
	let tableRowIds = $derived((tableRows ?? []).map((row) => row.id));
	let tableKey = $derived(JSON.stringify([data.queryKey('generation'), contributionMode]));
	/** One accepted table, including the labels that describe its values. */
	let displayedTable = $state.raw(
		/** @type {{key: string, structure: string, group: string, basis: 'power' | 'energy',
		 * contributionMode: import('./types.js').ContributionMode, rows: import('./types.js').FuelTechTableRow[],
		 * curtailmentRows: import('./types.js').CurtailmentTableRow[], overlaySummary: import('./types.js').OverlaySummary} | null} */ (
			null
		)
	);
	let tableValuesPending = $derived(
		!data.ready('generation') ||
			providers.pending ||
			!!providers.error ||
			displayedTable?.key !== tableKey
	);
	let tableStructurePending = $derived(
		!!displayedTable && displayedTable.structure !== `${region}|${group}`
	);
	$effect(() => {
		if (
			!tablePanelOpen ||
			!data.ready('generation') ||
			providers.pending ||
			providers.error ||
			!tableRows
		)
			return;
		displayedTable = {
			key: tableKey,
			structure: `${region}|${group}`,
			group,
			basis: range.activeMetric,
			contributionMode,
			rows: tableRows,
			curtailmentRows: table.curtailmentRows,
			overlaySummary: table.overlaySummary
		};
	});
	// Visibility stays responsive while the values are held through a refresh.
	let displayedRows = $derived(
		displayedTable?.rows.map((row) => ({ ...row, hidden: hiddenSeries.includes(row.id) })) ?? null
	);
	const EMPTY_OVERLAYS = /** @type {any[]} */ ([]);
	const GENERATION_PREFETCH_PLAN = createTrackerPrefetchPlan('energy');
	let pricePrefetchPlan = $derived(createTrackerPrefetchPlan(priceMetric));
	let emissionsPrefetchPlan = $derived(createTrackerPrefetchPlan(emissionsMetric));

	let releasedKey = $state('');
	let switchKey = $derived(`${region}|${group}|${range.activeMetric}|${range.activeInterval}`);
	let chartsHoldFrame = $derived(releasedKey !== switchKey || range.rangeSwitchPending);
	$effect(() => {
		if (!data.settled) return;
		releasedKey = switchKey;
		range.settle();
	});
	/** @param {GenerationSnapshot} value */
	const handleGenerationData = (value) => data.publish('generation', value);
	/** @param {GenerationSnapshot} value */
	const handlePriceData = (value) => data.publish('market', value);
	/** @param {GenerationSnapshot} value */
	const handleEmissionsData = (value) => data.publish('emissions', value);

	let containerWidth = $state(0);
	let panelSize = $state(30);
	const PANEL_MIN_PX = 320;
	let panelMin = $derived(
		Math.min(80, containerWidth ? (PANEL_MIN_PX / containerWidth) * 100 : 30)
	);
	let effectivePanelSize = $derived(Math.max(panelMin, panelSize));
	const panelResize = createResizeControl({
		axis: 'x',
		get: () => effectivePanelSize,
		set: (value) => {
			panelSize = value;
		},
		min: () => panelMin,
		max: () => 80,
		scale: () => (containerWidth ? 100 / containerWidth : 0),
		inverted: true,
		step: 2
	});
	onMount(() =>
		session.connect(() => [generationChart, priceChart, emissionsChart, ...providers.all])
	);
	let overlayLines = $derived.by(() => {
		if (!showDemandLine && !showRenewablesLine) return EMPTY_OVERLAYS;
		const { start, end } = viewWindow;
		/** @type {any[]} */
		const lines = [];
		if (showDemandLine) {
			lines.push({
				id: 'demand',
				label: 'Demand',
				data: demandData.getDisplayRows(start, end, displayRowOpts),
				valueKey: 'demand',
				colour: DEMAND_LINE_COLOUR,
				scale: 'y'
			});
		}
		if (showRenewablesLine) {
			lines.push({
				id: 'renewable-share',
				label: 'Renewables',
				data: isRollingDisplay
					? rollingShareRows(marketData.getVisibleRows(start - ROLLING_LEAD_MS, end), {
							startMs: start,
							endMs: end,
							displayInterval: range.displayInterval,
							ianaTimeZone,
							bucketFilter
						})
					: shareData.getDisplayRows(start, end, shareRowOpts),
				valueKey: 'renewable_share',
				colour: RENEWABLES_LINE_COLOUR,
				scale: 'percent',
				tooltipUnit: '%',
				formatTooltipValue: formatTrackerPercentageValue
			});
		}
		return lines;
	});

	/** Hatched curtailment bands riding the generation stack's top. */
	let overlayAreas = $derived.by(() => {
		if (!shownCurtailment.length) return EMPTY_OVERLAYS;
		return [
			{
				id: 'curtailment',
				data: curtailmentData.getDisplayRows(viewWindow.start, viewWindow.end, displayRowOpts),
				series: shownCurtailment.map(({ id, colour, label }) => ({ id, colour, label }))
			}
		];
	});

	/** @param {TrackerOverlay} overlay @param {boolean} [exclusive] */
	function toggleOverlay(overlay, exclusive = false) {
		if (exclusive) {
			// Solo the overlay: hide every fuel-tech series in the current grouping.
			hiddenState = { group, ids: tableRowIds };
			onoverlayschange?.([overlay]);
			return;
		}
		onoverlayschange?.(
			overlays.includes(overlay)
				? overlays.filter((item) => item !== overlay)
				: [...overlays, overlay]
		);
	}

	/** @param {string} id @param {boolean} [exclusive] */
	function toggleCurtailment(id, exclusive = false) {
		const overlay = curtailmentOverlayFor(id);
		if (overlay) toggleOverlay(overlay, exclusive);
	}

	/** @param {string} series @param {boolean} [exclusive] */
	function toggleSeries(series, exclusive = false) {
		if (exclusive) {
			hiddenState = { group, ids: tableRowIds.filter((id) => id !== series) };
			onoverlayschange?.([]);
			return;
		}
		const ids = hiddenSeries;
		const visibleCount = tableRowIds.filter((id) => !ids.includes(id)).length;
		// Toggling off the last visible series restores everything instead.
		if (!ids.includes(series) && visibleCount === 1) {
			showAllSeries();
			onoverlayschange?.([]);
			return;
		}
		hiddenState = {
			group,
			ids: ids.includes(series) ? ids.filter((item) => item !== series) : [...ids, series]
		};
	}

	function showAllSeries() {
		hiddenState = { group, ids: [] };
	}

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	/** @param {import('./types.js').ExportDatasetKey | 'xlsx'} [requested]
	 * @returns {Omit<TrackerExportContext, 'sourceUrl' | 'generatedAtMs'> & {error: boolean}} */
	export function getExportContext(requested = 'xlsx') {
		const names = /** @type {const} */ (['generation', 'market', 'emissions']);
		const required = requested === 'xlsx' ? names : names.filter((name) => name === requested);
		const needsTable = requested === 'table' || (requested === 'xlsx' && tablePanelOpen);
		const pending =
			required.some((name) => !data.ready(name)) || (needsTable && tableValuesPending);
		return {
			region,
			regionLabel:
				TRACKER_REGION_OPTIONS.find((option) => option.value === region)?.label ?? region,
			group,
			groupLabel: getGroup(group).label,
			contributionMode,
			basis: range.activeMetric,
			displayInterval: range.displayInterval,
			intervalLabel: intervalBadge,
			rangeLabel,
			rangeSlug: rangeSlugFor(range),
			timeZone,
			window: viewWindow,
			priceMetric,
			emissionsMetric,
			generation: data.current('generation'),
			price: data.current('market'),
			emissions: data.current('emissions'),
			tableRows: tableValuesPending ? null : displayedRows,
			curtailmentRows: displayedTable?.curtailmentRows ?? [],
			overlaySummary: displayedTable?.overlaySummary ?? null,
			tablePanelOpen,
			hiddenSeries,
			pending,
			error: required.some((name) => !!data.state(name).error) || (needsTable && !!providers.error)
		};
	}
</script>

<div class="flex min-h-0 flex-1 flex-row" bind:clientWidth={containerWidth}>
	<!-- No space-y: each card's full-gap drag handle is the spacer between cards.
	     Right padding yields to the panel drag handle when the panel is open —
	     the handle IS the gap between the columns. -->
	<div
		class="min-w-0 flex-1 overflow-y-auto py-4 pl-4 md:py-6 md:pl-6 {tablePanelOpen
			? ''
			: 'pr-4 md:pr-6'}"
		use:clickoutside={{ event: 'pointerdown', options: true }}
		onclickoutside={() => (panZoomEngaged = false)}
	>
		<ChartCard
			title="Generation"
			badge={intervalBadge}
			engaged={panZoomEngaged}
			heightStorageKey="tracker-chart-height-generation"
		>
			{#snippet children(heightPx)}
				<NetworkChart
					bind:this={generationChart}
					{region}
					{bucketFilter}
					metric={range.activeMetric}
					interval={range.activeInterval}
					displayInterval={range.displayInterval}
					{group}
					chartKind="stacked"
					nightShading
					{timeZone}
					{dateStart}
					{dateEnd}
					title={energyMetric ? 'Energy' : 'Power'}
					chartHeightPx={heightPx}
					generationUnitOptions
					{overlayLines}
					{overlayAreas}
					showContainer={false}
					tooltipMode="floating"
					hiddenSeriesNames={hiddenSeries}
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(next) => session.moveViewport(next, generationChart)}
					onviewportsettle={session.settleViewport}
					onvisibledata={handleGenerationData}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
					gestureActive={session.gestureActive}
					ongesturechange={(active) => (session.gestureActive = active)}
					loadingLabel={rangeLabel}
					holdFrame={chartsHoldFrame}
					prefetchPlan={GENERATION_PREFETCH_PLAN}
				/>
			{/snippet}
		</ChartCard>

		<ChartCard
			title="Market"
			engaged={panZoomEngaged}
			heightStorageKey="tracker-chart-height-price"
		>
			{#snippet actions()}
				{#if regionHasSpotPrice}
					<SwitchTabs
						buttons={[
							{ label: 'Price', value: 'price' },
							{ label: 'Market value', value: 'market_value' }
						]}
						selected={priceMode}
						onChange={(value) =>
							onpricemodechange?.(/** @type {import('./types.js').PriceMode} */ (value))}
					/>
				{:else}
					<span class="text-xs text-mid-grey"> No national spot price — showing market value </span>
				{/if}
			{/snippet}
			{#snippet children(heightPx)}
				<NetworkChart
					bind:this={priceChart}
					{region}
					{bucketFilter}
					metric={priceMetric}
					interval={range.activeInterval}
					displayInterval={range.displayInterval}
					{group}
					chartKind={priceIsMarketValue ? 'stacked' : 'line'}
					{timeZone}
					{dateStart}
					{dateEnd}
					title={priceIsMarketValue
						? 'Market value'
						: isRollingDisplay
							? 'Volume-weighted price'
							: 'Spot price'}
					chartHeightPx={heightPx}
					showContainer={false}
					tooltipMode="floating"
					hiddenSeriesNames={priceIsMarketValue ? hiddenSeries : []}
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(next) => session.moveViewport(next, priceChart)}
					onviewportsettle={session.settleViewport}
					onvisibledata={handlePriceData}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
					gestureActive={session.gestureActive}
					ongesturechange={(active) => (session.gestureActive = active)}
					loadingLabel={rangeLabel}
					holdFrame={chartsHoldFrame}
					prefetchPlan={pricePrefetchPlan}
				/>
			{/snippet}
		</ChartCard>

		<ChartCard
			title="Emissions"
			engaged={panZoomEngaged}
			heightStorageKey="tracker-chart-height-emissions"
		>
			{#snippet actions()}
				<SwitchTabs
					buttons={[
						{ label: 'Intensity', value: 'intensity' },
						{ label: 'Volume', value: 'volume' }
					]}
					selected={emissionsMode}
					onChange={(value) =>
						onemissionsmodechange?.(/** @type {import('./types.js').EmissionsMode} */ (value))}
				/>
			{/snippet}
			{#snippet children(heightPx)}
				<NetworkChart
					bind:this={emissionsChart}
					{region}
					{bucketFilter}
					metric={emissionsMetric}
					interval={range.activeInterval}
					displayInterval={range.displayInterval}
					{group}
					chartKind={emissionsIsIntensity ? 'line' : 'stacked'}
					{timeZone}
					{dateStart}
					{dateEnd}
					title={emissionsIsIntensity ? 'Intensity' : 'Volume'}
					chartHeightPx={heightPx}
					showContainer={false}
					tooltipMode="floating"
					hiddenSeriesNames={emissionsIsIntensity ? [] : hiddenSeries}
					excludedFuelTechGroups={emissionsIsIntensity ? hiddenSeries : []}
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(next) => session.moveViewport(next, emissionsChart)}
					onviewportsettle={session.settleViewport}
					onvisibledata={handleEmissionsData}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
					gestureActive={session.gestureActive}
					ongesturechange={(active) => (session.gestureActive = active)}
					loadingLabel={rangeLabel}
					holdFrame={chartsHoldFrame}
					prefetchPlan={emissionsPrefetchPlan}
				/>
			{/snippet}
		</ChartCard>
	</div>

	{#if tablePanelOpen}
		<!-- Panel divider — sits in the gap between the columns, outside the
		     panel container, matching the chart cards' handles. -->
		<!-- w-4: same gap length as the chart cards' h-4 drag handles. -->
		<DragHandle
			axis="x"
			onstart={panelResize.start}
			onkeydown={panelResize.keydown}
			tabindex={0}
			aria-valuemin={panelMin}
			aria-valuemax={80}
			aria-valuenow={Math.round(effectivePanelSize)}
			active={panelResize.dragging}
			alwaysShowGrip
			class="w-4 rounded-md"
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize table panel"
		/>
		<ResizablePanel
			open
			direction="left"
			defaultSize={effectivePanelSize}
			minSize={PANEL_MIN_PX}
			containerSize={containerWidth}
			showDragHandle={false}
			externalResizing={panelResize.dragging}
			onclose={() => onpaneltoggle?.(false)}
			class="z-20 flex bg-white"
		>
			{#snippet header()}<span class="hidden"></span>{/snippet}
			<FuelTechPanel
				rows={displayedRows}
				valuesPending={tableValuesPending}
				structurePending={tableStructurePending}
				error={tablePanelOpen ? providers.error : null}
				onretry={providers.retry}
				basis={displayedTable?.basis ?? range.activeMetric}
				displayPrefix={generationDisplayPrefix}
				group={displayedTable?.group ?? group}
				contributionMode={displayedTable?.contributionMode ?? contributionMode}
				hiddenCount={hiddenSeries.length}
				curtailmentRows={displayedTable?.curtailmentRows ?? []}
				shownCurtailment={shownCurtailmentIds}
				overlaySummary={displayedTable?.overlaySummary ?? null}
				{showDemandLine}
				{showRenewablesLine}
				ontoggle={toggleSeries}
				oncurtailmenttoggle={toggleCurtailment}
				ondemandlinetoggle={(exclusive) => toggleOverlay('demand', exclusive)}
				onrenewableslinetoggle={(exclusive) => toggleOverlay('renewables', exclusive)}
				onshowall={showAllSeries}
				onclose={() => onpaneltoggle?.(false)}
			/>
		</ResizablePanel>
	{:else}
		<!-- Keep the reopen action at the panel edge. -->
		<button
			type="button"
			onclick={() => onpaneltoggle?.(true)}
			aria-label="Show fuel tech table"
			class="z-20 flex w-10 shrink-0 cursor-pointer items-start justify-center border-l border-warm-grey bg-white pt-3 text-dark-grey transition-colors hover:bg-warm-grey"
		>
			<PanelRightOpen class="size-5" />
		</button>
	{/if}
</div>
