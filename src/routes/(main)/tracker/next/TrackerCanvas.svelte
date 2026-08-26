<script>
	/**
	 * TrackerCanvas — the tracker page's chart machinery.
	 *
	 * Owns the shared range control, the three always-mounted synced charts
	 * (Generation, Price⇄Market Value, Emissions Intensity⇄Volume) and the two
	 * headless providers feeding the fuel-tech table. Split toggles flip metric
	 * props on a single chart instance — the viewport lives in the chart host,
	 * so there is no remount and the previous frame stays up under the loading
	 * veil while the new metric arrives.
	 *
	 * The page owns the URL-parsed state (region/group/modes/panel) and passes
	 * it down; the canvas hands its live range control up via `oncontrolschange`
	 * so the nav bar drives the charts directly, and reports range changes back
	 * through `onrangechange`.
	 */

	import { onMount, tick, untrack } from 'svelte';
	import { clickoutside } from '@svelte-put/clickoutside';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import ResizablePanel from '$lib/components/ui/resizable-panel/resizable-panel.svelte';
	import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import { createNetworkMarketData } from '$lib/components/charts/network/network-market-data.svelte.js';
	import { createNetworkFuelTechMarketValue } from '$lib/components/charts/network/network-fueltech-market-value.svelte.js';
	import { createMarketSeriesProvider } from '$lib/components/charts/network/network-series-provider.svelte.js';
	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { getGroup, loadGroupsFor } from '$lib/components/charts/network/groups.js';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import { formatRangeLabel } from '$lib/components/charts/v2/time-format-policy.js';
	import { hasSpotPrice } from '../tracker-regions.js';
	import ChartCard from './ChartCard.svelte';
	import FuelTechPanel from './FuelTechPanel.svelte';
	import { normaliseRange, resolvePriceMode } from './tracker-model.js';
	import {
		buildFuelTechTableRows,
		computeCurtailmentRows,
		computeOverlaySummary,
		contributionDenominatorMWh
	} from './table-model.js';

	/** @type {{
	 *   region: string,
	 *   group: string,
	 *   priceMode: import('./types.js').PriceMode,
	 *   emissionsMode: import('./types.js').EmissionsMode,
	 *   tablePanelOpen: boolean,
	 *   initialRange: any,
	 *   initialNowMs?: number,
	 *   oncontrolschange?: (controls: { range: any, getRangeLabel: () => string }) => void,
	 *   onrangechange?: (range: any) => void,
	 *   ongroupchange?: (group: string) => void,
	 *   onpricemodechange?: (mode: import('./types.js').PriceMode) => void,
	 *   onemissionsmodechange?: (mode: import('./types.js').EmissionsMode) => void,
	 *   onpaneltoggle?: (open: boolean) => void
	 * }} */
	let {
		region,
		group,
		priceMode,
		emissionsMode,
		tablePanelOpen,
		initialRange,
		initialNowMs,
		oncontrolschange,
		onrangechange,
		ongroupchange,
		onpricemodechange,
		onemissionsmodechange,
		onpaneltoggle
	} = $props();

	const DAY_MS = 86_400_000;
	const INITIAL_RANGE_DAYS = 3;

	const initialAnchor = untrack(() =>
		Number.isFinite(initialNowMs) ? /** @type {number} */ (initialNowMs) : Date.now()
	);
	let anchorEnd = $state(initialAnchor);
	let anchorStart = $derived(anchorEnd - INITIAL_RANGE_DAYS * DAY_MS);
	let network = $derived(regionToNetwork(region));
	let timeZone = $derived(network.timeZone);
	let dateStart = $derived(
		toNetworkDateString(initialAnchor - INITIAL_RANGE_DAYS * DAY_MS, timeZone)
	);
	let dateEnd = $derived(toNetworkDateString(initialAnchor, timeZone));
	let viewStart = $state(0);
	let viewEnd = $state(0);

	/** @type {any} */ let generationChart = $state(undefined);
	/** @type {any} */ let priceChart = $state(undefined);
	/** @type {any} */ let emissionsChart = $state(undefined);

	/** @type {number | undefined} */
	let hoverTime = $state(undefined);
	let panZoomEngaged = $state(false);
	/** Fuel-tech groups toggled off via the table — hides chart series and
	 *  excludes them from the intensity ratio, never from table denominators.
	 *  Keyed to the grouping that produced the ids: a grouping change renames
	 *  every series, so stale toggles would silently hide unrelated groups. */
	let hiddenState = $state.raw({ group: '', ids: /** @type {string[]} */ ([]) });
	let hiddenSeries = $derived(hiddenState.group === group ? hiddenState.ids : []);
	/** @type {import('./types.js').ContributionMode} */
	let contributionMode = $state('generation');
	/** Latest generation visible-data snapshot — feeds the table. Kept (stale)
	 *  through refetches so the table never blanks. */
	/** @type {any} */
	let generationDataset = $state.raw(null);
	let containerWidth = $state(0);

	/** Table panel width (% of the row). Owned here — the drag handle sits in
	 *  the gap between the charts column and the panel, outside the panel
	 *  container, matching the chart cards' handles. */
	let panelSize = $state(30);
	let panelResizing = $state(false);
	const PANEL_MIN_PX = 320;

	/** @param {PointerEvent} e */
	function startPanelDrag(e) {
		e.preventDefault();
		panelResizing = true;
		const startX = e.clientX;
		const startSize = panelSize;

		/** @param {PointerEvent} moveEvent */
		function onMove(moveEvent) {
			if (!containerWidth) return;
			// The panel sits to the right — dragging left grows it.
			const deltaPct = ((startX - moveEvent.clientX) / containerWidth) * 100;
			const minPct = (PANEL_MIN_PX / containerWidth) * 100;
			panelSize = Math.min(80, Math.max(minPct, startSize + deltaPct));
		}

		function onUp() {
			panelResizing = false;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
		}

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
	}

	const range = createChartRangeControl({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		defaultViewport: () => ({ start: anchorStart, end: anchorEnd }),
		setViewport: (start, end) => {
			viewStart = start;
			viewEnd = end;
		},
		charts: () => [
			generationChart,
			priceChart,
			emissionsChart,
			marketData,
			mvData,
			demandData,
			curtailmentData,
			shareData
		],
		timeZone: () => timeZone,
		initialRangeDays: INITIAL_RANGE_DAYS
	});

	// Headless providers — same cache/dedup/reconcile path as the charts.
	const marketData = createNetworkMarketData({
		region: () => region,
		basis: () => range.activeMetric,
		interval: () => range.activeInterval,
		timeZone: () => timeZone
	});
	const mvData = createNetworkFuelTechMarketValue({
		region: () => region,
		group: () => group,
		interval: () => range.activeInterval,
		timeZone: () => timeZone
	});
	// Legacy-parity extras, all official OE series (not derived): operational
	// demand, the solar/wind curtailment pair, and the renewable share.
	const demandData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => (range.activeMetric === 'energy' ? 'demand_energy' : 'demand'),
		interval: () => range.activeInterval,
		timeZone: () => timeZone
	});
	const curtailmentData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => (range.activeMetric === 'energy' ? 'curtailment_energy' : 'curtailment'),
		interval: () => range.activeInterval,
		timeZone: () => timeZone
	});
	const shareData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => 'renewable_share',
		interval: () => range.activeInterval,
		timeZone: () => timeZone
	});

	let energyMetric = $derived(range.activeMetric === 'energy');
	let intervalBadge = $derived(
		getIntervalSpec(range.displayInterval)?.label ?? range.displayInterval
	);

	// Interval-aware nav readout — bucket names at FY/quarter/season grains,
	// clock times at sub-daily ones. Hoisted to the page via oncontrolschange.
	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let rangeLabel = $derived(
		formatRangeLabel(
			viewStart || anchorStart,
			viewEnd || anchorEnd,
			range.displayInterval,
			ianaTimeZone
		)
	);

	// The mode the price card actually renders — 'au' has no spot price, so the
	// card falls back to market value without losing the user's selection.
	let effectivePriceMode = $derived(resolvePriceMode(region, priceMode));
	let priceIsMarketValue = $derived(effectivePriceMode === 'market_value');
	let emissionsIsIntensity = $derived(emissionsMode === 'intensity');

	let loadSeriesIds = $derived(loadGroupsFor(getGroup(group)));

	// One snapshot of navigation state for the URL, debounced below.
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
	$effect(() => {
		if (!viewStart || !viewEnd) return;
		const snapshot = activeRange;
		const timer = setTimeout(() => onrangechange?.(snapshot), 300);
		return () => clearTimeout(timer);
	});

	// ============================================
	// Fuel-tech table feed
	// ============================================

	/** Table rows recompute when chart data lands or providers cache new rows —
	 *  never on hover, and only per settled snapshot during pans. */
	let tableRows = $derived.by(() => {
		if (!generationDataset) return null;
		const start = viewStart || anchorStart;
		const end = viewEnd || anchorEnd;
		return buildFuelTechTableRows({
			generationData: generationDataset,
			mvRows: mvData.getVisibleRows(start, end),
			demandRows: marketData.getVisibleRows(start, end),
			basis: range.activeMetric,
			demandBasis: range.activeMetric,
			mode: contributionMode,
			hiddenSeries,
			loadSeriesIds
		});
	});

	let tablePending = $derived(mvData.isPending || marketData.isPending || range.rangeSwitchPending);

	// Chart overlays — session-only toggles driven from the table's summary rows.
	let showDemandLine = $state(false);
	let showRenewablesLine = $state(false);
	/** Curtailment series toggled onto the generation chart as hatched bands. */
	let shownCurtailment = $state(/** @type {string[]} */ ([]));
	const CURTAILMENT_COLOURS = /** @type {Record<string, string>} */ ({
		curtailment_solar: getFuelTechColour('solar_utility'),
		curtailment_wind: getFuelTechColour('wind')
	});
	/** Fixed band order bottom-up: wind rides directly above the solar area,
	 *  solar curtailment stacks above wind — regardless of toggle order. */
	const CURTAILMENT_ORDER = ['curtailment_wind', 'curtailment_solar'];

	/** @param {string} id */
	function toggleCurtailment(id) {
		shownCurtailment = shownCurtailment.includes(id)
			? shownCurtailment.filter((item) => item !== id)
			: [...shownCurtailment, id];
	}
	const DEMAND_LINE_COLOUR = '#C74523';
	const RENEWABLES_LINE_COLOUR = getFuelTechColour('renewables');

	/** Display-grain options for the extras — they track the central Interval
	 *  control exactly like the charts. Per-bucket quantities (energy basis)
	 *  aggregate by sum; instantaneous ones by mean. */
	let displayRowOpts = $derived({
		displayInterval: range.displayInterval,
		ianaTimeZone,
		method: /** @type {'sum' | 'mean'} */ (range.activeMetric === 'energy' ? 'sum' : 'mean')
	});
	let shareRowOpts = $derived({
		displayInterval: range.displayInterval,
		ianaTimeZone,
		method: /** @type {'sum' | 'mean'} */ ('mean')
	});

	let overlayLines = $derived.by(() => {
		const start = viewStart || anchorStart;
		const end = viewEnd || anchorEnd;
		/** @type {any[]} */
		const lines = [];
		if (showDemandLine) {
			lines.push({
				id: 'demand',
				data: demandData.getDisplayRows(start, end, displayRowOpts),
				valueKey: 'demand',
				colour: DEMAND_LINE_COLOUR,
				scale: 'y'
			});
		}
		if (showRenewablesLine) {
			lines.push({
				id: 'renewable-share',
				data: shareData.getDisplayRows(start, end, shareRowOpts),
				valueKey: 'renewable_share',
				colour: RENEWABLES_LINE_COLOUR,
				scale: 'percent'
			});
		}
		return lines;
	});

	/** Hatched curtailment bands riding the generation stack's top. */
	let overlayAreas = $derived.by(() => {
		if (!shownCurtailment.length) return [];
		const start = viewStart || anchorStart;
		const end = viewEnd || anchorEnd;
		return [
			{
				id: 'curtailment',
				data: curtailmentData.getDisplayRows(start, end, displayRowOpts),
				series: CURTAILMENT_ORDER.filter((id) => shownCurtailment.includes(id)).map((id) => ({
					id,
					colour: CURTAILMENT_COLOURS[id] ?? '#888'
				}))
			}
		];
	});

	/** Curtailment sits outside the fuel-tech grouping but shares the table's
	 *  contribution denominator. */
	let curtailmentRows = $derived.by(() => {
		if (!generationDataset) return [];
		const start = viewStart || anchorStart;
		const end = viewEnd || anchorEnd;
		return computeCurtailmentRows({
			rows: curtailmentData.getDisplayRows(start, end, displayRowOpts),
			series: [
				{ id: 'curtailment_solar', label: 'Curtailment (Solar)' },
				{ id: 'curtailment_wind', label: 'Curtailment (Wind)' }
			],
			basis: range.activeMetric,
			denominatorMWh: contributionDenominatorMWh({
				generationRows: generationDataset.data,
				seriesNames: generationDataset.seriesNames,
				basis: range.activeMetric,
				mode: contributionMode,
				demandRows: marketData.getVisibleRows(start, end),
				demandBasis: range.activeMetric,
				loadSeriesIds
			})
		});
	});

	let overlaySummary = $derived.by(() => {
		const start = viewStart || anchorStart;
		const end = viewEnd || anchorEnd;
		return computeOverlaySummary({
			demandRows: demandData.getDisplayRows(start, end, displayRowOpts),
			marketRows: marketData.getVisibleRows(start, end),
			shareRows: shareData.getDisplayRows(start, end, shareRowOpts),
			basis: range.activeMetric
		});
	});

	/** @param {any} payload */
	function handleGenerationData(payload) {
		generationDataset = payload;
		range.settle();
	}

	/** @param {string} series */
	function toggleSeries(series) {
		const ids = hiddenSeries;
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

	// ============================================
	// Range snapshot API (page URL sync + popstate restore)
	// ============================================

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

	onMount(() => {
		oncontrolschange?.({ range, getRangeLabel: () => rangeLabel });
		applyRangeSnapshot(initialRange);
	});
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
					{overlayLines}
					{overlayAreas}
					showContainer={false}
					tooltipMode="strip"
					hiddenSeriesNames={hiddenSeries}
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(next) => range.handleDerivedViewportChange(next, generationChart)}
					onviewportsettle={range.handleViewportSettle}
					onvisibledata={handleGenerationData}
					onloadcomplete={() => range.settle()}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
				/>
			{/snippet}
		</ChartCard>

		<ChartCard
			title="Market"
			engaged={panZoomEngaged}
			heightStorageKey="tracker-chart-height-price"
		>
			{#snippet actions()}
				{#if hasSpotPrice(region)}
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
					metric={priceIsMarketValue ? 'market_value' : 'price'}
					interval={range.activeInterval}
					displayInterval={range.displayInterval}
					{group}
					chartKind={priceIsMarketValue ? 'stacked' : 'line'}
					{timeZone}
					{dateStart}
					{dateEnd}
					title={priceIsMarketValue ? 'Market value' : 'Spot price'}
					chartHeightPx={heightPx}
					showContainer={false}
					tooltipMode="strip"
					hiddenSeriesNames={priceIsMarketValue ? hiddenSeries : []}
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(next) => range.handleDerivedViewportChange(next, priceChart)}
					onviewportsettle={range.handleViewportSettle}
					onloadcomplete={() => range.settle()}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
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
					metric={emissionsIsIntensity ? 'emissions_intensity' : 'emissions'}
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
					tooltipMode="strip"
					hiddenSeriesNames={emissionsIsIntensity ? [] : hiddenSeries}
					excludedFuelTechGroups={emissionsIsIntensity ? hiddenSeries : []}
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(next) => range.handleDerivedViewportChange(next, emissionsChart)}
					onviewportsettle={range.handleViewportSettle}
					onloadcomplete={() => range.settle()}
					panZoomMode="tap-to-engage"
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
			onstart={startPanelDrag}
			active={panelResizing}
			class="w-4 rounded-md"
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize table panel"
		/>
		<ResizablePanel
			open
			direction="left"
			defaultSize={panelSize}
			minSize={PANEL_MIN_PX}
			containerSize={containerWidth}
			showDragHandle={false}
			externalResizing={panelResizing}
			onclose={() => onpaneltoggle?.(false)}
			class="z-20 flex bg-white"
		>
			{#snippet header()}<span class="hidden"></span>{/snippet}
			<FuelTechPanel
				rows={tableRows}
				pending={tablePending}
				basis={range.activeMetric}
				{group}
				{contributionMode}
				hiddenCount={hiddenSeries.length}
				{rangeLabel}
				{curtailmentRows}
				{shownCurtailment}
				curtailmentColours={CURTAILMENT_COLOURS}
				oncurtailmenttoggle={toggleCurtailment}
				{overlaySummary}
				{showDemandLine}
				{showRenewablesLine}
				demandLineColour={DEMAND_LINE_COLOUR}
				renewablesLineColour={RENEWABLES_LINE_COLOUR}
				ondemandlinetoggle={() => (showDemandLine = !showDemandLine)}
				onrenewableslinetoggle={() => (showRenewablesLine = !showRenewablesLine)}
				{ongroupchange}
				oncontributionmodechange={(mode) => (contributionMode = mode)}
				ontoggle={toggleSeries}
				onshowall={showAllSeries}
			/>
		</ResizablePanel>
	{/if}
</div>
