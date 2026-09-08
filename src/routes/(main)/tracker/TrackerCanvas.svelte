<script>
	import { onMount, tick, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { clickoutside } from '@svelte-put/clickoutside';
	import PanelToggle from './PanelToggle.svelte';
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
	import { getGroup, loadGroupsFor } from '$lib/components/charts/network/groups.js';
	import {
		bucketFilterKindFor,
		bucketFilterOptionsFor
	} from '$lib/components/charts/v2/bucket-filter.js';
	import { createContributionContext } from '$lib/components/charts/network/contribution.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import { hasSpotPrice, TRACKER_REGION_OPTIONS } from './tracker-regions.js';
	import ChartCard from './ChartCard.svelte';
	import ReadingFreshness from './ReadingFreshness.svelte';
	import FuelTechPanel from './FuelTechPanel.svelte';
	import FuelTechOptions from './FuelTechOptions.svelte';
	import DateComparison from './DateComparison.svelte';
	import WindowMetrics from './WindowMetrics.svelte';
	import { comparisonBuckets } from './comparison.js';
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
	let showContributions = $derived(session.selection.generationTransform === 'proportion');
	let needsContributionDemand = $derived(showContributions && contributionMode === 'demand');
	let hoverTime = $state(/** @type {number | undefined} */ (undefined));
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
	function openComparison() {
		const buckets = comparisonBuckets(data.ready('generation') ? data.current('generation') : null);
		session.select('comparison', { a: buckets[0]?.time ?? null, b: buckets.at(-1)?.time ?? null });
	}
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
	const PREFETCH_PLAN = createTrackerPrefetchPlan();

	let releasedKey = $state('');
	let switchKey = $derived(`${region}|${group}|${range.activeMetric}|${range.activeInterval}`);
	let chartsHoldFrame = $derived(releasedKey !== switchKey || range.rangeSwitchPending);
	let metricsStatus = $derived(
		Object.fromEntries(
			['generation', 'market', 'emissions', 'demand', 'renewables'].map((name) => {
				if (name === 'demand' || name === 'renewables') {
					const provider =
						name === 'demand' ? demandData : isRollingDisplay ? marketData : shareData;
					return [
						name,
						{
							error: provider.error,
							pending:
								!provider.error && (chartsHoldFrame || session.gestureActive || provider.isPending)
						}
					];
				}
				const key = /** @type {import('./tracker-data.svelte.js').ChartKey} */ (name);
				return [
					name,
					{
						error: data.state(key).error,
						pending:
							!data.state(key).error &&
							(chartsHoldFrame || session.gestureActive || !data.ready(key))
					}
				];
			})
		)
	);
	let renewableShareRows = $derived(
		isRollingDisplay
			? rollingShareRows(
					marketData.getVisibleRows(viewWindow.start - ROLLING_LEAD_MS, viewWindow.end),
					{
						startMs: viewWindow.start,
						endMs: viewWindow.end,
						displayInterval: range.displayInterval,
						ianaTimeZone,
						bucketFilter
					}
				)
			: shareData.getDisplayRows(viewWindow.start, viewWindow.end, shareRowOpts)
	);
	let metricsInput = $derived({
		generation:
			!metricsStatus.generation.pending && !metricsStatus.generation.error
				? data.current('generation')
				: null,
		market:
			!metricsStatus.market.pending && !metricsStatus.market.error ? data.current('market') : null,
		emissions:
			!metricsStatus.emissions.pending && !metricsStatus.emissions.error
				? data.current('emissions')
				: null,
		demand:
			!metricsStatus.demand.pending && !metricsStatus.demand.error
				? {
						data: demandData.getDisplayRows(viewWindow.start, viewWindow.end, displayRowOpts),
						start: viewWindow.start,
						end: viewWindow.end,
						seriesNames: ['demand']
					}
				: null,
		renewables:
			!metricsStatus.renewables.pending && !metricsStatus.renewables.error
				? {
						data: renewableShareRows,
						start: viewWindow.start,
						end: viewWindow.end,
						seriesNames: ['renewable_share']
					}
				: null,
		hidden: hiddenSeries,
		basis: range.activeMetric,
		priceMetric,
		emissionsMetric
	});
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
			ready:
				showContributions &&
				!chartsHoldFrame &&
				(contributionMode === 'generation' || contributionDemandReady)
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
	let metricsWidth = $state(256);
	let metricsMax = $derived(
		Math.max(
			224,
			Math.min(
				400,
				containerWidth -
					(wideLayout.current
						? (tablePanelOpen ? PANEL_MIN_PX : PANEL_RAIL_PX) + CHART_SPACE_PX
						: 56)
			)
		)
	);
	let effectiveMetricsWidth = $derived(Math.min(metricsWidth, metricsMax));
	let metricsReserved = $derived(
		metricsOpen && wideLayout.current ? effectiveMetricsWidth : PANEL_RAIL_PX
	);
	let metricsToggle = $state(/** @type {HTMLButtonElement | undefined} */ (undefined));
	let metricsPane = $state(/** @type {HTMLDivElement | undefined} */ (undefined));
	async function openMetrics() {
		metricsOpenOverride = true;
		await tick();
		metricsPane?.querySelector('button')?.focus();
	}
	async function closeMetrics() {
		handleHoverChange(undefined);
		metricsOpenOverride = false;
		// The opener is mounted after this event; return keyboard focus to it.
		await tick();
		metricsToggle?.focus();
	}
	let tableToggle = $state(/** @type {HTMLButtonElement | undefined} */ (undefined));
	let tableCloseButton = $state(/** @type {HTMLButtonElement | undefined} */ (undefined));
	/** @param {boolean} open */
	async function changeTablePanel(open) {
		onpaneltoggle(open);
		await tick();
		(open ? tableCloseButton : tableToggle)?.focus();
	}
	const metricsResize = createResizeControl({
		axis: 'x',
		get: () => effectiveMetricsWidth,
		set: (value) => {
			metricsWidth = value;
		},
		min: () => 224,
		max: () => metricsMax,
		commit: () => {
			try {
				localStorage.setItem('tracker-metrics-width', String(metricsWidth));
			} catch {
				/* Resizing remains usable without persistence. */
			}
		}
	});
	onMount(() => {
		try {
			const saved = Number(localStorage.getItem('tracker-metrics-width'));
			if (Number.isFinite(saved) && saved >= 224) metricsWidth = Math.min(400, saved);
		} catch {
			/* Storage can be unavailable in embedded/private contexts. */
		}
	});
	let panelSize = $state(30);
	let panelMin = $derived(
		Math.min(80, containerWidth ? (PANEL_MIN_PX / containerWidth) * 100 : 30)
	);
	let panelMax = $derived(
		wideLayout.current && containerWidth
			? Math.max(
					panelMin,
					Math.min(80, ((containerWidth - metricsReserved - CHART_SPACE_PX) / containerWidth) * 100)
				)
			: 80
	);
	let effectivePanelSize = $derived(Math.min(panelMax, Math.max(panelMin, panelSize)));
	const panelResize = createResizeControl({
		axis: 'x',
		get: () => effectivePanelSize,
		set: (value) => {
			panelSize = value;
		},
		min: () => panelMin,
		max: () => panelMax,
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
				label: showContributions ? 'Renewables (% of gross demand)' : 'Renewables',
				data: renewableShareRows,
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
			session.selectVisibility(tableRowIds, [overlay]);
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
			session.selectVisibility(
				tableRowIds.filter((id) => id !== series),
				[]
			);
			return;
		}
		const ids = hiddenSeries;
		const visibleCount = tableRowIds.filter((id) => !ids.includes(id)).length;
		// Toggling off the last visible series restores everything instead.
		if (!ids.includes(series) && visibleCount === 1) {
			session.selectVisibility([], []);
			return;
		}
		session.selectVisibility(
			ids.includes(series) ? ids.filter((item) => item !== series) : [...ids, series]
		);
	}

	function showAllSeries() {
		session.selectVisibility([]);
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

{#snippet fuelTechOptions()}
	<FuelTechOptions
		{group}
		{contributionMode}
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
		if (event.key === 'Escape' && metricsOpen && !wideLayout.current) closeMetrics();
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
	data-png-context={`${TRACKER_REGION_OPTIONS.find((option) => option.value === region)?.label ?? region} · ${rangeLabel} · ${intervalBadge} · UTC${timeZone} · ${getGroup(group).label}${imageFilterLabel ? ` · ${imageFilterLabel}` : ''}`}
>
	{#if metricsOpen}
		<div
			bind:this={metricsPane}
			id="tracker-metrics-panel"
			class="z-30 flex shrink-0 {wideLayout.current
				? 'relative'
				: 'absolute inset-y-0 left-0 shadow-xl'}"
			style:width={`${effectiveMetricsWidth}px`}
			data-testid="metrics-pane"
		>
			<ResizablePanel
				open
				direction="right"
				onclose={closeMetrics}
				defaultSize={100}
				showDragHandle={false}
				externalResizing={metricsResize.dragging}
				class="flex min-w-0 flex-1 bg-white"
			>
				{#snippet header()}<span class="hidden"></span>{/snippet}
				<WindowMetrics
					input={metricsInput}
					status={metricsStatus}
					onretry={(id) =>
						(id === 'demand'
							? demandData
							: isRollingDisplay
								? marketData
								: shareData
						).reconcileFetches()}
					{rangeLabel}
					interval={range.displayInterval}
					intervalLabel={intervalBadge}
					zone={timeZone}
					generationPrefix={generationDisplayPrefix}
					filterLabel={imageFilterLabel}
					onhighlight={handleHoverChange}
					onclose={closeMetrics}
				/>
			</ResizablePanel>
			<DragHandle
				axis="x"
				onstart={metricsResize.start}
				onkeydown={metricsResize.keydown}
				tabindex={0}
				aria-valuemin={224}
				aria-valuemax={metricsMax}
				aria-valuenow={Math.round(effectiveMetricsWidth)}
				active={metricsResize.dragging}
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
		<div class="flex w-[48px] shrink-0 justify-center border-r border-warm-grey bg-white pt-[4px]">
			<PanelToggle
				side="left"
				open={metricsOpen}
				label="Show metrics"
				controls="tracker-metrics-panel"
				onclick={openMetrics}
				bind:el={metricsToggle}
			/>
		</div>
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
			badge={intervalBadge}
			engaged={panZoomEngaged}
			heightStorageKey="tracker-chart-height-generation"
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
				{#if showContributions}
					<p class="px-3 py-1 text-xs text-mid-grey" role="status">
						{#if needsContributionDemand && marketData.error}
							Gross-demand percentages unavailable.
							<button class="underline" onclick={() => marketData.reconcileFetches()}
								>Retry percentage data</button
							>
						{:else if needsContributionDemand && !contributionDemandReady}
							Loading gross-demand percentages…
						{:else}
							Shares per interval; the table summarises the selected window. Change the basis in
							Fuel technology options → Contribution.
						{/if}
					</p>
				{/if}
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
					interpolateRooftop
					dataTransform={session.selection.generationTransform}
					ondatatransformchange={(value) => session.select('generationTransform', value)}
					createProportionContext={chartContributionContext}
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
					prefetchPlan={pageVisible ? PREFETCH_PLAN : null}
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
					dataTransform={priceIsMarketValue ? session.selection.marketValueTransform : 'absolute'}
					ondatatransformchange={(value) => session.select('marketValueTransform', value)}
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
					prefetchPlan={pageVisible ? PREFETCH_PLAN : null}
				/>
			{/snippet}
		</ChartCard>

		<ChartCard
			title="Emissions"
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
					prefetchPlan={pageVisible ? PREFETCH_PLAN : null}
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
			aria-valuemax={panelMax}
			aria-valuenow={Math.round(effectivePanelSize)}
			active={panelResize.dragging}
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
			defaultSize={effectivePanelSize}
			minSize={PANEL_MIN_PX}
			containerSize={containerWidth}
			showDragHandle={false}
			externalResizing={panelResize.dragging}
			onclose={() => changeTablePanel(false)}
			class="z-20 flex bg-white"
		>
			{#snippet header()}<span class="hidden"></span>{/snippet}
			<FuelTechPanel
				options={fuelTechOptions}
				bind:closeButton={tableCloseButton}
				rows={displayedRows}
				valuesPending={tableValuesPending}
				structurePending={tableStructurePending}
				error={tablePanelOpen ? providers.error : null}
				onretry={providers.retry}
				basis={displayedTable?.basis ?? range.activeMetric}
				rooftopInterpolation={range.displayInterval === '5m'}
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
				onclose={() => changeTablePanel(false)}
			/>
		</ResizablePanel>
	{:else}
		<!-- Keep the reopen action at the panel edge. -->
		<div
			class="z-20 flex w-[48px] shrink-0 flex-col items-center border-l border-warm-grey bg-white pt-[4px]"
		>
			<PanelToggle
				side="right"
				open={false}
				label="Show fuel tech table"
				controls="tracker-table-panel"
				onclick={() => changeTablePanel(true)}
				bind:el={tableToggle}
			/>
			{@render fuelTechOptions()}
		</div>
	{/if}
</div>
