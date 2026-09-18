<script>
	import { getTimeFormatPolicy } from '$lib/components/charts/v2/time-format-policy.js';
	import { onMount, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { clickoutside } from '@svelte-put/clickoutside';
	import PanelRail from './PanelRail.svelte';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import { createDockedPanel } from '$lib/components/ui/panel/docked-panel.svelte.js';
	import { percentPanelBounds } from '$lib/components/ui/panel/panel-bounds.js';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import ResizablePanel from '$lib/components/ui/resizable-panel/resizable-panel.svelte';
	import { rangeSlugFor } from '$lib/components/charts/facility/range-params.js';
	import {
		getIntervalSpec,
		isRollingInterval
	} from '$lib/components/charts/facility/range-interval-config.js';
	import { getGroup, loadGroupsFor } from '$lib/components/charts/network/groups.js';
	import {
		bucketFilterKindFor,
		bucketFilterOptionsFor
	} from '$lib/components/charts/v2/bucket-filter.js';
	import { createContributionContext } from '$lib/components/charts/network/contribution.js';
	import { RENEWABLES_SERIES_ID } from '$lib/components/charts/network/market-series-ids.js';
	import { toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import { hasSpotPrice, regionLabel } from './tracker-regions.js';
	import ChartCard from './ChartCard.svelte';
	import ReadingFreshness from './ReadingFreshness.svelte';
	import FuelTechPanel from './FuelTechPanel.svelte';
	import FuelTechOptions from './FuelTechOptions.svelte';
	import DateComparison from './DateComparison.svelte';
	import WindowMetrics from './WindowMetrics.svelte';
	import { comparisonBuckets } from './comparison.js';
	import { createTrackerPrefetchPlan } from './tracker-prefetch.js';
	import { createLoadingNotice } from './tracker-loading.svelte.js';
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
	import { createTrackerMetrics } from './tracker-metrics.svelte.js';
	import { toggleOverlayVisibility, toggleSeriesVisibility } from './tracker-visibility.js';

	/** @typedef {import('./types.js').TrackerOverlay} TrackerOverlay */
	/** @typedef {import('./types.js').GenerationSnapshot} GenerationSnapshot */
	/** @typedef {import('./types.js').TrackerExportContext} TrackerExportContext */
	/** @type {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>}} */
	let { session } = $props();
	let pageVisible = $state(true);
	onMount(() => {
		pageVisible = !document.hidden;
	});
	const range = untrack(() => session.range);
	let region = $derived(session.selection.region);
	let group = $derived(session.selection.group);
	let contributionMode = $derived(session.selection.contributionMode);
	let priceMode = $derived(session.selection.priceMode);
	let emissionsMode = $derived(session.selection.emissionsMode);
	let overlays = $derived(session.selection.overlays);
	let tablePanelOpen = $derived(session.selection.tablePanelOpen);
	let comparison = $derived(session.selection.comparison);
	let bucketFilter = $derived(session.selection.bucketFilter);
	let imageFilterLabel = $derived(
		bucketFilterOptionsFor(bucketFilterKindFor(range.displayInterval))?.find(
			(option) => option.id === bucketFilter
		)?.label
	);
	let timeZone = $derived(session.timeZone);
	let ianaTimeZone = $derived(session.ianaTimeZone);
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
	let showContributions = $derived(session.selection.generationTransform === 'proportion');
	let needsContributionDemand = $derived(contributionMode === 'demand');
	let previewTime = $state(/** @type {number | undefined} */ (undefined));
	let metricsPanel = $state.raw(/** @type {WindowMetrics | undefined} */ (undefined));
	let panZoomEngaged = $state(false);
	let hiddenSeries = $derived(session.selection.hiddenSeries);
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
		timeZone: () => timeZone,
		needsContributionDemand: () => needsContributionDemand,
		needsWindowMetrics: () => metricsOpen
	});
	const { marketData, demandData, curtailmentData } = providers;
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
		queryKey: () => data.queryKey('generation'),
		ready: () => data.ready('generation'),
		hidden: () => hiddenSeries,
		contribution: () => contributionMode,
		ianaTimeZone: () => ianaTimeZone,
		inspectTime: () => hoverTime
	});
	const metrics = createTrackerMetrics({
		session: untrack(() => session),
		data,
		providers,
		table,
		hidden: () => hiddenSeries,
		priceMetric: () => priceMetric,
		emissionsMetric: () => emissionsMetric,
		holdFrame: () => chartsHoldFrame
	});
	function openComparison() {
		const buckets = comparisonBuckets(data.ready('generation') ? data.current('generation') : null);
		session.select('comparison', { a: buckets[0]?.time ?? null, b: buckets.at(-1)?.time ?? null });
	}
	let displayRowOpts = $derived(table.displayRowOpts);
	let tableRowIds = $derived(table.rowIds);
	let displayedTable = $derived(table.accepted);
	let tableValuesPending = $derived(table.valuesPending);
	let displayedRows = $derived(table.displayedRows);
	let inspectedTable = $derived(table.inspection);
	let tablePeriod = $derived(
		inspectedTable
			? getTimeFormatPolicy(range.displayInterval, ianaTimeZone).formatTooltip(inspectedTable.time)
			: 'Visible window'
	);
	const EMPTY_OVERLAYS = /** @type {any[]} */ ([]);
	const PREFETCH_PLAN = createTrackerPrefetchPlan();

	let releasedKey = $state('');
	let switchKey = $derived(`${region}|${group}|${range.activeMetric}|${range.activeInterval}`);
	let chartsHoldFrame = $derived(releasedKey !== switchKey || range.rangeSwitchPending);
	// One loading treatment for the selected window, including table/overlay feeds.
	// Accepted snapshots keep background cache warming from dimming the whole tracker.
	let pendingData = $derived(
		!session.gestureActive &&
			(chartsHoldFrame ||
				(!data.current('generation') && !data.state('generation').error) ||
				(!data.current('market') && !data.state('market').error) ||
				(!data.current('emissions') && !data.state('emissions').error) ||
				providers.pending)
	);
	const loadingNotice = createLoadingNotice(() => pendingData);
	let trackerLoading = $derived(loadingNotice.active);
	/** The navigation and every data surface share this visual loading lifecycle. */
	export function isLoading() {
		return trackerLoading;
	}
	let contributionDemandReady = $derived(!marketData.isPending && !marketData.error);
	let imageProvidersReady = $derived(
		[
			...(needsContributionDemand || (overlays.includes('renewables') && isRollingDisplay)
				? [marketData]
				: []),
			...(overlays.includes('demand') ? [providers.demandData] : []),
			...(overlays.includes('renewables') && !isRollingDisplay ? [providers.shareData] : []),
			...(overlays.some((id) => id.startsWith('curtailment-')) ? [providers.curtailmentData] : [])
		].every((provider) => !provider.isPending && !provider.error)
	);
	let contributionDemandRows = $derived(
		needsContributionDemand && contributionDemandReady
			? marketData.getDisplayRows(viewWindow.start, viewWindow.end, displayRowOpts)
			: []
	);
	/** @param {TimeSeriesData[]} rows @param {string[]} names */
	function chartContributionContext(rows, names) {
		return createContributionContext({
			generationRows: rows,
			demandRows: contributionDemandRows,
			seriesNames: names,
			loadSeriesIds: loadGroupsFor(getGroup(group)),
			mode: contributionMode,
			ready: !chartsHoldFrame && (contributionMode === 'generation' || contributionDemandReady)
		});
	}
	$effect(() => {
		if (!data.settled) return;
		releasedKey = switchKey;
		range.settle();
	});
	/** @param {GenerationSnapshot} value */
	const handleGenerationData = (value) => data.publish('generation', value);
	/** Do not advance while the active query or a required provider is still loading.
	 * Failed requests are eligible for the next scheduled attempt. */
	export function isLiveReady() {
		return data.settled && !providers.pending && !session.gestureActive;
	}
	/** @param {GenerationSnapshot} value */
	const handlePriceData = (value) => data.publish('market', value);
	/** @param {GenerationSnapshot} value */
	const handleEmissionsData = (value) => data.publish('emissions', value);

	let containerWidth = $state(0);
	const PANEL_MIN_PX = 320;
	// Reserve a usable chart column, including its padding and table divider.
	const CHART_SPACE_PX = 376;
	const PANEL_RAIL_PX = 48;
	const wideLayout = new MediaQuery('(min-width: 1024px)', true);
	let metricsOpenOverride = $state(/** @type {boolean | null} */ (null));
	let metricsOpen = $derived(metricsOpenOverride ?? wideLayout.current);
	let hoverTime = $derived(
		previewTime ?? (metricsOpen ? metricsPanel?.getSelectedTime() : undefined)
	);
	// Metrics pane: pixel width, remembered locally. Desktop widths leave room
	// for the chart column and the fuel-tech table; small screens overlay.
	const METRICS_MIN_PX = 224;
	let metricsMax = $derived(
		Math.max(
			METRICS_MIN_PX,
			Math.min(
				400,
				containerWidth -
					(wideLayout.current
						? (tablePanelOpen ? PANEL_MIN_PX : PANEL_RAIL_PX) + CHART_SPACE_PX
						: 56)
			)
		)
	);
	let metricsPane = $state(/** @type {HTMLDivElement | undefined} */ (undefined));
	const metricsDock = createDockedPanel({
		initial: 256,
		min: () => METRICS_MIN_PX,
		max: () => metricsMax,
		storageKey: 'tracker-metrics-width',
		setOpen: (open) => {
			if (!open) handleHoverChange(undefined);
			metricsOpenOverride = open;
		},
		focusOnOpen: () => metricsPane?.querySelector('button')
	});
	let metricsReserved = $derived(
		metricsOpen && wideLayout.current ? metricsDock.size : PANEL_RAIL_PX
	);
	// Fuel-tech table: a percentage of the container, bounded so the charts
	// keep a usable column. Its open state lives in the URL.
	let panelBounds = $derived(
		percentPanelBounds({
			containerWidth,
			minPx: PANEL_MIN_PX,
			reservedPx: metricsReserved + CHART_SPACE_PX,
			maxPct: 80,
			wide: wideLayout.current,
			narrowMaxPct: 80
		})
	);
	const tablePanel = createDockedPanel({
		initial: 30,
		min: () => panelBounds.min,
		max: () => panelBounds.max,
		scale: () => (containerWidth ? 100 / containerWidth : 0),
		inverted: true,
		step: 2,
		setOpen: onpaneltoggle
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
				label: showContributions ? 'Renewables (% of gross demand)' : 'Renewables',
				data: providers.renewableShareRows(start, end, table.shareRowOpts),
				valueKey: 'renewable_share',
				colour: RENEWABLES_LINE_COLOUR,
				scale: 'percent',
				tooltipUnit: '%',
				formatTooltipValue: formatTrackerPercentageValue,
				absoluteTooltipValue: {
					data: marketData.getDisplayRows(start, end, displayRowOpts),
					valueKey: RENEWABLES_SERIES_ID
				}
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

	let visibility = $derived({ hiddenSeries, overlays, rowIds: tableRowIds });

	/** Solo pushes one history entry; a plain overlay toggle replaces (see README).
	 * @param {TrackerOverlay} overlay @param {boolean} [exclusive] */
	function toggleOverlay(overlay, exclusive = false) {
		const next = toggleOverlayVisibility(visibility, overlay, exclusive);
		if (exclusive) session.selectVisibility(next.hiddenSeries, next.overlays);
		else onoverlayschange?.(next.overlays);
	}

	/** @param {string} id @param {boolean} [exclusive] */
	function toggleCurtailment(id, exclusive = false) {
		const overlay = curtailmentOverlayFor(id);
		if (overlay) toggleOverlay(overlay, exclusive);
	}

	/** @param {string} series @param {boolean} [exclusive] */
	function toggleSeries(series, exclusive = false) {
		const next = toggleSeriesVisibility(visibility, series, exclusive);
		session.selectVisibility(next.hiddenSeries, next.overlays);
	}

	function showAllSeries() {
		session.selectVisibility([]);
	}

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		previewTime = time;
	}

	/** Everything the three timeline charts share: scope, grain, hover and
	 *  gesture wiring, the held-frame veil and idle prefetch. Each card adds
	 *  its metric, chart kind, transforms and its own viewport/data callbacks.
	 *  `hoverTime` is passed separately: it reads the metrics pane's selection,
	 *  and the pane's inputs read the charts' query state, so folding it into
	 *  one spread object would make that derivation reference itself. */
	let sharedChartProps = $derived(
		/** @type {Pick<import('svelte').ComponentProps<typeof NetworkChart>,
		 * 'region' | 'bucketFilter' | 'interval' | 'displayInterval' | 'group' | 'timeZone' |
		 * 'dateStart' | 'dateEnd' | 'showContainer' | 'tooltipMode' | 'onhoverchange' |
		 * 'onviewportsettle' | 'panZoomMode' | 'gestureActive' | 'ongesturechange' |
		 * 'showLoadingIndicator' | 'holdFrame' | 'prefetchPlan'>} */ ({
			region,
			bucketFilter,
			interval: range.activeInterval,
			displayInterval: range.displayInterval,
			group,
			timeZone,
			dateStart,
			dateEnd,
			showContainer: false,
			tooltipMode: 'strip',
			onhoverchange: handleHoverChange,
			onviewportsettle: session.settleViewport,
			panZoomMode: 'tap-to-engage',
			gestureActive: session.gestureActive,
			ongesturechange: (active) => (session.gestureActive = active),
			showLoadingIndicator: false,
			holdFrame: chartsHoldFrame,
			prefetchPlan: pageVisible ? PREFETCH_PLAN : null
		})
	);

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
			regionLabel: regionLabel(region),
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

{#snippet fuelTechOptions()}
	<FuelTechOptions
		{group}
		{contributionMode}
		tableColumns={session.selection.tableColumns}
		oncolumnschange={(value) => session.select('tableColumns', value)}
		ongroupchange={(value) => session.select('group', value)}
		oncontributionchange={(value) => session.select('contributionMode', value)}
	/>
{/snippet}

{#snippet freshness(name = /** @type {'generation' | 'market' | 'emissions'} */ ('generation'))}
	<ReadingFreshness
		snapshot={data.current(name)}
		now={session.clockMs}
		interval={range.activeInterval}
		following={session.following}
		pending={data.state(name).pending || !data.current(name)}
		error={data.state(name).error}
		timeZone={ianaTimeZone}
		filtered={!!bucketFilter}
	/>
{/snippet}
{#snippet generationFreshness()}{@render freshness('generation')}{/snippet}
{#snippet marketFreshness()}{@render freshness('market')}{/snippet}
{#snippet emissionsFreshness()}{@render freshness('emissions')}{/snippet}

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && metricsOpen && !wideLayout.current) metricsDock.close();
	}}
/>
<svelte:document
	onvisibilitychange={() => {
		pageVisible = !document.hidden;
	}}
/>

<div
	class="relative flex min-h-0 flex-1 flex-row"
	bind:clientWidth={containerWidth}
	data-png-context={`${regionLabel(region)} · ${rangeLabel} · ${intervalBadge} · UTC${timeZone} · ${getGroup(group).label}${imageFilterLabel ? ` · ${imageFilterLabel}` : ''}`}
>
	{#if metricsOpen}
		<div
			bind:this={metricsPane}
			id="tracker-metrics-panel"
			class="z-30 flex shrink-0 {wideLayout.current
				? 'relative'
				: 'absolute inset-y-0 left-0 shadow-xl'}"
			style:width={`${metricsDock.size}px`}
			data-testid="metrics-pane"
		>
			<ResizablePanel
				open
				direction="right"
				onclose={metricsDock.close}
				defaultSize={100}
				showDragHandle={false}
				externalResizing={metricsDock.dragging}
				class="flex min-w-0 flex-1 bg-white"
			>
				{#snippet header()}<span class="hidden"></span>{/snippet}
				<WindowMetrics
					bind:this={metricsPanel}
					input={metrics.input}
					status={metrics.status}
					onretry={metrics.retry}
					interval={range.displayInterval}
					zone={timeZone}
					generationPrefix={generationDisplayPrefix}
					onhighlight={handleHoverChange}
					onclose={metricsDock.close}
				/>
			</ResizablePanel>
			<DragHandle
				axis="x"
				onstart={metricsDock.start}
				onkeydown={metricsDock.keydown}
				tabindex={0}
				aria-valuemin={METRICS_MIN_PX}
				aria-valuemax={metricsMax}
				aria-valuenow={Math.round(metricsDock.size)}
				active={metricsDock.dragging}
				alwaysShowGrip
				class="w-4 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey"
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize metrics panel"
				title="Drag to resize metrics, or use the arrow keys"
			/>
		</div>
	{/if}
	{#if !metricsOpen || !wideLayout.current}
		<PanelRail
			side="left"
			label="Show metrics"
			controls="tracker-metrics-panel"
			onopen={metricsDock.open}
			bind:opener={metricsDock.opener}
		/>
	{/if}
	<!-- No space-y: each card's full-gap drag handle is the spacer between cards.
	     Side padding yields to an open docked pane's drag handle — the handle
	     IS the page-background gap between the white columns. -->
	<div
		class="min-w-0 flex-1 overflow-y-auto py-4 md:py-6 {metricsOpen && wideLayout.current
			? ''
			: 'pl-4 md:pl-6'} {tablePanelOpen ? '' : 'pr-4 md:pr-6'}"
		use:clickoutside={{ event: 'pointerdown', options: true }}
		onclickoutside={() => (panZoomEngaged = false)}
	>
		<ChartCard
			title="Generation"
			loading={trackerLoading}
			status={generationFreshness}
			png={{
				id: 'generation',
				label: 'Generation',
				caption:
					range.displayInterval === '5m' &&
					Object.values(data.current('generation')?.groupFuelTechs ?? {}).some((codes) =>
						codes.includes('solar_rooftop')
					)
						? 'Rooftop solar: 5-minute chart values interpolated between reported half-hour values'
						: '',
				ready:
					data.ready('generation') &&
					!chartsHoldFrame &&
					!session.gestureActive &&
					imageProvidersReady
			}}
			engaged={panZoomEngaged}
			heightStorageKey="tracker-chart-height-generation"
			defaultHeightPx={320}
		>
			{#snippet actions()}
				<button
					class="text-xs underline"
					aria-expanded={!!comparison}
					onclick={() => (comparison ? session.select('comparison', null) : openComparison())}
					>Compare dates</button
				>
			{/snippet}
			{#snippet children(heightPx)}
				{#if showContributions || (needsContributionDemand && marketData.error)}
					<p class="px-3 py-1 text-xs text-mid-grey" role="status">
						{#if needsContributionDemand && marketData.error}
							Gross-demand percentages unavailable.
							<button class="underline" onclick={() => marketData.reconcileFetches()}
								>Retry percentage data</button
							>
						{:else}
							Shares per interval; the table summarises the selected window. Change the basis in
							Fuel technology options → Contribution.
						{/if}
					</p>
				{/if}
				<NetworkChart
					bind:this={generationChart}
					{...sharedChartProps}
					{hoverTime}
					metric={range.activeMetric}
					chartKind="stacked"
					nightShading
					title={energyMetric ? 'Energy' : 'Power'}
					chartHeightPx={heightPx}
					generationUnitOptions
					interpolateRooftop
					dataTransform={session.selection.generationTransform}
					ondatatransformchange={(value) => session.select('generationTransform', value)}
					createProportionContext={chartContributionContext}
					{overlayLines}
					{overlayAreas}
					hiddenSeriesNames={hiddenSeries}
					onviewportchange={(next) => session.moveViewport(next, generationChart)}
					onvisibledata={handleGenerationData}
					bind:panZoomEngaged
				/>
			{/snippet}
		</ChartCard>

		{#if comparison}
			<DateComparison
				{group}
				snapshot={data.ready('generation') ? data.current('generation') : null}
				selection={comparison}
				hidden={hiddenSeries}
				pending={!data.state('generation').error && !data.ready('generation')}
				error={data.state('generation').error}
				{region}
				zone={timeZone}
				interval={range.displayInterval}
				energy={energyMetric}
				prefix={generationDisplayPrefix}
				onchange={(value) => session.select('comparison', value)}
			/>
		{/if}

		<ChartCard
			title="Market"
			loading={trackerLoading}
			status={marketFreshness}
			png={{
				id: 'market',
				label: 'Market',
				ready: data.ready('market') && !chartsHoldFrame && !session.gestureActive
			}}
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
					{...sharedChartProps}
					{hoverTime}
					metric={priceMetric}
					chartKind={priceIsMarketValue ? 'stacked' : 'line'}
					title={priceIsMarketValue
						? 'Market value'
						: isRollingDisplay
							? 'Volume-weighted price'
							: 'Spot price'}
					chartHeightPx={heightPx}
					hiddenSeriesNames={priceIsMarketValue ? hiddenSeries : []}
					dataTransform={priceIsMarketValue ? session.selection.marketValueTransform : 'absolute'}
					ondatatransformchange={(value) => session.select('marketValueTransform', value)}
					onviewportchange={(next) => session.moveViewport(next, priceChart)}
					onvisibledata={handlePriceData}
					bind:panZoomEngaged
				/>
			{/snippet}
		</ChartCard>

		<ChartCard
			title="Emissions"
			loading={trackerLoading}
			status={emissionsFreshness}
			png={{
				id: 'emissions',
				label: 'Emissions',
				ready: data.ready('emissions') && !chartsHoldFrame && !session.gestureActive
			}}
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
					{...sharedChartProps}
					{hoverTime}
					metric={emissionsMetric}
					chartKind={emissionsIsIntensity ? 'line' : 'stacked'}
					title={emissionsIsIntensity ? 'Intensity' : 'Volume'}
					chartHeightPx={heightPx}
					hiddenSeriesNames={emissionsIsIntensity ? [] : hiddenSeries}
					excludedFuelTechGroups={emissionsIsIntensity ? hiddenSeries : []}
					onviewportchange={(next) => session.moveViewport(next, emissionsChart)}
					onvisibledata={handleEmissionsData}
					bind:panZoomEngaged
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
			onstart={tablePanel.start}
			onkeydown={tablePanel.keydown}
			tabindex={0}
			aria-valuemin={panelBounds.min}
			aria-valuemax={panelBounds.max}
			aria-valuenow={Math.round(tablePanel.size)}
			active={tablePanel.dragging}
			alwaysShowGrip
			class="w-4 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey"
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize table panel"
			title="Drag to resize the table, or use the arrow keys"
		/>
		<ResizablePanel
			open
			direction="left"
			defaultSize={tablePanel.size}
			minSize={PANEL_MIN_PX}
			containerSize={containerWidth}
			showDragHandle={false}
			externalResizing={tablePanel.dragging}
			onclose={tablePanel.close}
			class="z-20 flex bg-white"
		>
			{#snippet header()}<span class="hidden"></span>{/snippet}
			<FuelTechPanel
				loading={trackerLoading}
				options={fuelTechOptions}
				bind:closeButton={tablePanel.closer}
				rows={inspectedTable?.rows ?? displayedRows}
				periodLabel={tablePeriod}
				inspecting={!!inspectedTable}
				tableColumns={session.selection.tableColumns}
				valuesPending={tableValuesPending}
				error={data.state('generation').error ?? providers.error}
				onretry={() => {
					generationChart?.reconcileFetches();
					providers.retry();
				}}
				basis={displayedTable?.basis ?? range.activeMetric}
				rooftopInterpolation={range.displayInterval === '5m'}
				displayPrefix={generationDisplayPrefix}
				group={displayedTable?.group ?? group}
				contributionMode={displayedTable?.contributionMode ?? contributionMode}
				hiddenCount={hiddenSeries.length}
				curtailmentRows={inspectedTable?.curtailmentRows ?? displayedTable?.curtailmentRows ?? []}
				shownCurtailment={shownCurtailmentIds}
				overlaySummary={inspectedTable?.overlaySummary ?? displayedTable?.overlaySummary ?? null}
				{showDemandLine}
				{showRenewablesLine}
				ontoggle={toggleSeries}
				oncurtailmenttoggle={toggleCurtailment}
				ondemandlinetoggle={(exclusive) => toggleOverlay('demand', exclusive)}
				onrenewableslinetoggle={(exclusive) => toggleOverlay('renewables', exclusive)}
				onshowall={showAllSeries}
				onclose={tablePanel.close}
			/>
		</ResizablePanel>
	{:else}
		<!-- Keep the reopen action at the panel edge. -->
		<PanelRail
			side="right"
			label="Show fuel tech table"
			controls="tracker-table-panel"
			onopen={tablePanel.open}
			bind:opener={tablePanel.opener}
		>
			{@render fuelTechOptions()}
		</PanelRail>
	{/if}
</div>
