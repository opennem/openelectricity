<script>
	/**
	 * GenerationPanel — the tracker panel's grid/region generation view, the
	 * explore-style counterpart to InterconnectorDetail. One component covers
	 * every scope: `region` ('au' | '_all' | NEM region | 'wem') parameterises
	 * the charts, metrics and corridor list, so switching scope morphs the live
	 * instance (NetworkChart swaps its warm-stashed data manager and the
	 * viewport carries over) rather than remounting. 'au' is NEM+WEM combined —
	 * /api/network/data merges the two networks server-side; having no national
	 * spot price, the scope drops the price chart and avgPrice metric.
	 *
	 * Layout matches /facility/[code]: a grey canvas of white sectionCardClass
	 * cards — the metrics card headed by the range/date tray, then the
	 * generation and price charts driven by one createChartRangeControl, then
	 * the scope's corridors, each with its flow chart inline (no click-through
	 * needed; every InterconnectorChart shares one corridor-agnostic fetch).
	 * The generation chart matches the homepage 7-day tracker visual: default
	 * cumulative stack (loads pull the whole area below zero) + night shading.
	 * The renewables % follows the homepage methodology via the headless
	 * market pair (see network-market-data).
	 */

	import { tick, untrack } from 'svelte';
	import { ChevronRight, LineChart } from '@lucide/svelte';
	import { clickoutside } from '@svelte-put/clickoutside';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import {
		formatDateRange,
		ChartRangeBar,
		sectionCardClass,
		toolbarTrayClass
	} from '$lib/components/charts/v2';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
	import {
		parseRangeParams,
		applyRangeParams
	} from '$lib/components/charts/facility/range-params.js';
	import { MIN_DATE } from '$lib/utils/date-range';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import { replaceState } from '$app/navigation';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import InterconnectorChart from '$lib/components/charts/flows/InterconnectorChart.svelte';
	import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
	import { createNetworkMarketData } from '$lib/components/charts/network/network-market-data.svelte.js';
	import { INTERCONNECTORS, interconnectorsForRegion } from '$lib/flows/region-geo.js';
	import { NETWORK_METRIC_KEYS } from '$lib/components/charts/network/network-metric-definitions.js';
	import { regionsNemOnlyOptions } from '$lib/regions.js';
	import { isWholeNetworkScope, hasSpotPrice } from './tracker-regions.js';
	import NetworkMetrics from './NetworkMetrics.svelte';
	import PriceChipRow from './PriceChipRow.svelte';
	import CorridorMetrics from './CorridorMetrics.svelte';

	/**
	 * @type {{
	 *   region: string,
	 *   flows?: Record<string, number>,
	 *   prices?: Record<string, number>,
	 *   dispatchDateTimeString?: string,
	 *   onselectinterconnector?: (key: string) => void
	 * }}
	 */
	let {
		region,
		flows = {},
		prices = {},
		dispatchDateTimeString = '',
		onselectinterconnector
	} = $props();

	const DAY_MS = 24 * 60 * 60 * 1000;
	// 7 days picks up the 7D preset (30m display over 5m native) — the explore
	// reference view. The corridor panel keeps its own live 1D default.
	const INITIAL_RANGE_DAYS = 7;

	let network = $derived(regionToNetwork(region));
	let tz = $derived(network.timeZone);
	let ianaTimeZone = $derived(ianaFromOffset(tz));

	// Window end anchor — starts at mount (the host keeps this component mounted
	// across scope switches, so the viewport carries over) and re-anchors on
	// every new dispatch snapshot (see the live-edge effect).
	const mountEnd = Date.now();
	let anchorEnd = $state(mountEnd);
	let anchorStart = $derived(anchorEnd - INITIAL_RANGE_DAYS * DAY_MS);
	// Initial chart viewport strings only — superseded once the load-complete
	// range apply lands, so these deliberately stay at the mount anchor.
	let dateStart = $derived(toNetworkDateString(mountEnd - INITIAL_RANGE_DAYS * DAY_MS, tz));
	let dateEnd = $derived(toNetworkDateString(mountEnd, tz));

	// ============================================
	// Live strip (grid-live snapshot values)
	// ============================================

	const NEM_CHIP_CODES = regionsNemOnlyOptions
		.filter((r) => r.value !== '_all')
		.map((r) => r.value.toUpperCase());

	// 'au' shows the NEM chips like '_all' — spot prices are NEM-only and each
	// chip is labelled with its own region code, so they stay honest under a
	// national heading.
	let chipCodes = $derived(
		region === 'wem' ? [] : isWholeNetworkScope(region) ? NEM_CHIP_CODES : [region.toUpperCase()]
	);

	// No national spot price exists — the All Regions scope drops the price
	// chart (its $state ref stays undefined; the range control skips falsy
	// chart entries) and the avgPrice metric cell.
	let hasPriceChart = $derived(hasSpotPrice(region));

	// ============================================
	// Range control + charts
	// ============================================

	let viewStart = $state(0);
	let viewEnd = $state(0);

	let dateRangeLabel = $derived.by(() => {
		const start = viewStart || anchorStart;
		const end = viewEnd || anchorEnd;
		return formatDateRange(new Date(start), new Date(end), ianaTimeZone, {
			yearIfNotCurrent: true
		});
	});

	/** @type {import('$lib/components/charts/network/NetworkChart.svelte').default | undefined} */
	let generationChart = $state(undefined);
	/** @type {import('$lib/components/charts/network/NetworkChart.svelte').default | undefined} */
	let priceChart = $state(undefined);
	/** @type {import('$lib/components/charts/network/NetworkChart.svelte').default | undefined} */
	let emissionsVolumeChart = $state(undefined);
	/** @type {import('$lib/components/charts/network/NetworkChart.svelte').default | undefined} */
	let emissionsIntensityChart = $state(undefined);
	/** Inline corridor flow charts, keyed by corridor. Plain object — the range
	 *  control reads it lazily at push time, and unmounted refs null out via
	 *  bind:this so the falsy-skips in the controller drop them.
	 *  @type {Record<string, import('$lib/components/charts/flows/InterconnectorChart.svelte').default | null>} */
	const flowCharts = {};

	const range = createChartRangeControl({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		defaultViewport: () => ({ start: anchorStart, end: anchorEnd }),
		setViewport: (startMs, endMs) => {
			viewStart = startMs;
			viewEnd = endMs;
		},
		charts: () => [
			generationChart,
			priceChart,
			emissionsVolumeChart,
			emissionsIntensityChart,
			marketData,
			...Object.values(flowCharts)
		],
		timeZone: () => tz,
		initialRangeDays: INITIAL_RANGE_DAYS
	});

	// Volume ⇄ Intensity tab for the Emissions card (facility design). Only the
	// active variant is mounted; on switch the fresh instance is synced to the
	// live viewport — its own seed is the mount anchor, which goes stale once
	// the user pans or picks a range.
	/** @type {'volume' | 'intensity'} */
	let emissionsTab = $state('volume');

	/** @param {string} value */
	async function handleEmissionsTabChange(value) {
		emissionsTab = /** @type {'volume' | 'intensity'} */ (value);
		await tick();
		const chart = value === 'volume' ? emissionsVolumeChart : emissionsIntensityChart;
		if (chart && viewStart && viewEnd) {
			chart.setViewport(viewStart, viewEnd);
			chart.reconcileFetches();
		}
	}

	// A scope switch away from 'au' mounts the price chart fresh while the
	// other charts stay warm — sync the new instance to the live viewport
	// (same treatment as the emissions tab switch). Keyed on the bind ref
	// only; the viewport reads are untracked so pans don't re-trigger it.
	$effect(() => {
		const chart = priceChart;
		if (!chart) return;
		untrack(() => {
			if (viewStart && viewEnd) {
				chart.setViewport(viewStart, viewEnd);
				chart.reconcileFetches();
			}
		});
	});

	// The controller ladders power↔energy; the corridor charts map that onto
	// the OE flows metric pair (same as InterconnectorDetail).
	let flowMetric = $derived(
		/** @type {'flows' | 'flows_energy'} */ (
			range.activeMetric === 'energy' ? 'flows_energy' : 'flows'
		)
	);

	// Headless renewables/gross-demand pair — listed in `charts` above, so the
	// range control keeps its window in lockstep with the visible charts.
	const marketData = createNetworkMarketData({
		region: () => region,
		basis: () => range.activeMetric,
		interval: () => range.activeInterval,
		timeZone: () => tz
	});

	// Live-edge advance, keyed on the grid-live dispatch snapshot — same pattern
	// as InterconnectorDetail. The advance is untracked: it moves the viewport
	// and anchors, none of which may re-trigger this effect.
	/** Non-reactive last-seen guard, same pattern as the map's lastFocusKey. */
	let lastDispatch = '';
	$effect(() => {
		const ts = dispatchDateTimeString;
		if (!ts || ts === lastDispatch) return;
		const isFirst = lastDispatch === '';
		lastDispatch = ts;
		if (isFirst) return;
		untrack(() => {
			const newEnd = Date.now();
			// Pinned test reads the pre-advance anchor, so slide before re-anchoring.
			range.advanceLiveEdge(newEnd);
			anchorEnd = newEnd;
		});
	});

	// ============================================
	// Visible data → metrics
	// ============================================

	// Debounced visible-range rows from the charts. $state.raw — these hold the
	// full visible row arrays and are replaced wholesale, never mutated.
	/** @type {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null} */
	let generationData = $state.raw(null);
	/** @type {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null} */
	let priceData = $state.raw(null);
	// Viewport snapshot taken when visible data lands, so the metrics recompute
	// on the debounced cadence rather than per pan frame.
	let metricsWindow = $state.raw({ start: 0, end: 0 });

	/** @param {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> }} d */
	function handleGenerationVisibleData(d) {
		generationData = d;
		metricsWindow = { start: viewStart, end: viewEnd };
		range.settle();
	}

	/** @param {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> }} d */
	function handlePriceVisibleData(d) {
		priceData = d;
	}

	// ============================================
	// Initial range (URL params or default preset) + load tracking
	// ============================================

	let generationLoaded = $state(false);
	let generationHasData = $state(false);
	let noData = $derived(generationLoaded && !generationHasData);

	let rangeApplied = false;

	/** Apply the initial range through the normal selection paths: the URL's
	 *  range params when present (shared links reproduce the view), otherwise
	 *  the default preset. Reads window.location rather than page.url — the
	 *  latter goes stale after the tracker's shallow replaceState updates. */
	function applyInitialRange() {
		const parsed = parseRangeParams(new URLSearchParams(window.location.search), {
			nowMs: Date.now()
		});
		if (!parsed) {
			range.handleRangeSelect(INITIAL_RANGE_DAYS);
			return;
		}
		if (parsed.kind === 'preset') {
			range.handleRangeSelect(parsed.days);
		} else {
			range.handleDateRangeChange({
				start: new Date(parsed.startMs).toISOString(),
				end: new Date(parsed.endMs).toISOString()
			});
		}
		if (parsed.intervalId) range.handleIntervalChange(parsed.intervalId);
	}

	/** @param {{ hasData: boolean }} state */
	function handleLoadComplete({ hasData }) {
		if (!rangeApplied) {
			rangeApplied = true;
			applyInitialRange();
		}
		generationLoaded = true;
		generationHasData = hasData;
		range.settle();
	}

	// Keep the selected range shareable: mirror it into the query string once
	// the chart has settled. Debounced so pan/zoom doesn't thrash the URL;
	// shallow replaceState (the tracker's convention) so the page load doesn't
	// re-run. Loop-free — depends on range/viewport state only, never the URL.
	$effect(() => {
		const state = {
			selectedRange: range.selectedRange,
			displayInterval: range.displayInterval,
			viewStart,
			viewEnd,
			defaultRangeDays: INITIAL_RANGE_DAYS
		};
		if (!generationLoaded || !state.viewStart || !state.viewEnd) return;
		const timer = setTimeout(() => {
			const url = new URL(window.location.href);
			const before = url.searchParams.toString();
			applyRangeParams(url.searchParams, state);
			if (url.searchParams.toString() === before) return;
			replaceState(`${url.pathname}${url.search}`, {});
		}, 300);
		return () => clearTimeout(timer);
	});

	// ============================================
	// Hover / pan-zoom shared across charts + metrics
	// ============================================

	/** @type {number | undefined} */
	let hoverTime = $state(undefined);

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	/** Shared tap-to-engage pan/zoom across both charts — keeps wheel/drag from
	 *  hijacking the panel's scroll until the user opts in. */
	let panZoomEngaged = $state(false);
	let engagedCardClass = $derived([sectionCardClass, panZoomEngaged && '!border-dark-grey']);

	// ============================================
	// Interconnectors for this scope
	// ============================================

	// Whole-network scopes surface every corridor (they're NEM-only but still
	// meaningful nationally); WEM has none.
	let regionInterconnectors = $derived(
		region === 'wem'
			? []
			: isWholeNetworkScope(region)
				? INTERCONNECTORS
				: interconnectorsForRegion(region.toUpperCase())
	);
</script>

<div class="min-h-full space-y-4 bg-light-warm-grey p-4">
	<!-- Metrics card, headed by the range/date tray; the live spot-price strip
	     sits below the grid so the tray keeps the card's rounded top. -->
	<div class={sectionCardClass}>
		<div class="{toolbarTrayClass} rounded-t-lg py-2 pr-2 pl-4">
			<span class="text-sm font-medium text-dark-grey">{dateRangeLabel}</span>
			<ChartRangeBar
				selectedRange={range.selectedRange}
				customDays={range.customDays}
				displayInterval={range.displayInterval}
				startDate={range.pickerStartDate}
				endDate={range.pickerEndDate}
				minDate={MIN_DATE}
				maxDate={range.maxDate}
				showIntervalDropdown={true}
				raised
				compact
				pending={range.rangeSwitchPending}
				onrangeselect={range.handleRangeSelect}
				ondaterangechange={range.handleDateRangeChange}
				onintervalchange={range.handleIntervalChange}
			/>
		</div>
		<div class="border-t border-mid-warm-grey/40">
			<NetworkMetrics
				{generationData}
				{priceData}
				marketProvider={marketData}
				viewStart={metricsWindow.start}
				viewEnd={metricsWindow.end}
				basis={range.activeMetric}
				displayInterval={range.displayInterval}
				timeZone={tz}
				metricKeys={hasPriceChart
					? NETWORK_METRIC_KEYS
					: NETWORK_METRIC_KEYS.filter((k) => k !== 'avgPrice')}
				onpeakhighlight={handleHoverChange}
			/>
		</div>
		<PriceChipRow
			codes={chipCodes}
			{prices}
			{dispatchDateTimeString}
			class="border-t border-mid-warm-grey/40 px-4 py-2"
		/>
	</div>

	<!-- Charts stay mounted under the empty state (visibility, not display:none —
	     LayerCake needs a real size) so a later range pick can still recover.
	     One clickoutside zone spans every chart card (generation, price and the
	     corridor flows), so a pointerdown anywhere else releases the shared
	     tap-to-engage pan/zoom; the no-data overlay covers only the
	     generation/price pair — the corridor charts carry their own data. -->
	<div
		class="space-y-4"
		use:clickoutside={{ event: 'pointerdown', options: true }}
		onclickoutside={() => (panZoomEngaged = false)}
	>
		<div class="relative space-y-4">
			<div class={['space-y-4', noData && 'invisible']}>
				<section class={engagedCardClass}>
					<div class="flex items-center justify-between gap-4 px-4 pb-1 pt-3">
						<h3 class="m-0 text-sm font-semibold text-dark-grey">Generation</h3>
						<span class="rounded bg-light-warm-grey px-2 py-0.5 text-xs text-dark-grey">
							{getIntervalSpec(range.displayInterval)?.label ?? range.displayInterval}
						</span>
					</div>
					<div class="px-2 pb-2">
						<NetworkChart
							bind:this={generationChart}
							{region}
							metric={range.activeMetric}
							interval={range.activeInterval}
							displayInterval={range.displayInterval}
							group="detailed"
							chartKind="stacked"
							nightShading
							timeZone={tz}
							{dateStart}
							{dateEnd}
							title={range.activeMetric === 'energy' ? 'Energy' : 'Power'}
							chartHeight="h-[240px]"
							showContainer={false}
							tooltipMode="strip"
							{hoverTime}
							onhoverchange={handleHoverChange}
							onviewportchange={(r) => range.handleDerivedViewportChange(r, generationChart)}
							onviewportsettle={range.handleViewportSettle}
							onloadcomplete={handleLoadComplete}
							onvisibledata={handleGenerationVisibleData}
							panZoomMode="tap-to-engage"
							bind:panZoomEngaged
						/>
					</div>
				</section>

				<!-- No card h3 — the chart's own header carries the "Price" title with
				     the pan/zoom controls, matching the corridor flow cards. Absent
				     for All Regions: there is no national spot price. -->
				{#if hasPriceChart}
					<section class={engagedCardClass}>
						<div class="px-2 py-2">
							<NetworkChart
								bind:this={priceChart}
								{region}
								metric="price"
								interval={range.activeInterval}
								displayInterval={range.displayInterval}
								chartKind="line"
								timeZone={tz}
								{dateStart}
								{dateEnd}
								chartHeight="h-[140px]"
								showContainer={false}
								tooltipMode="strip"
								{hoverTime}
								onhoverchange={handleHoverChange}
								onviewportchange={(r) => range.handleDerivedViewportChange(r, priceChart)}
								onviewportsettle={range.handleViewportSettle}
								onvisibledata={handlePriceVisibleData}
								panZoomMode="tap-to-engage"
								bind:panZoomEngaged
							/>
						</div>
					</section>
				{/if}

				<!-- Emissions — Volume ⇄ Intensity toggle per the facility design; the
				     chart's own header carries the variant title + pan/zoom controls. -->
				<section class={engagedCardClass}>
					<div class="flex items-center justify-between gap-4 px-4 pb-1 pt-3">
						<h3 class="m-0 text-sm font-semibold text-dark-grey">Emissions</h3>
						<SwitchTabs
							buttons={[
								{ label: 'Intensity', value: 'intensity' },
								{ label: 'Volume', value: 'volume' }
							]}
							selected={emissionsTab}
							onChange={handleEmissionsTabChange}
						/>
					</div>
					<div class="px-2 pb-2">
						{#if emissionsTab === 'volume'}
							<NetworkChart
								bind:this={emissionsVolumeChart}
								{region}
								metric="emissions"
								interval={range.activeInterval}
								displayInterval={range.displayInterval}
								group="detailed"
								chartKind="stacked"
								timeZone={tz}
								{dateStart}
								{dateEnd}
								title="Volume"
								chartHeight="h-[160px]"
								showContainer={false}
								tooltipMode="strip"
								{hoverTime}
								onhoverchange={handleHoverChange}
								onviewportchange={(r) => range.handleDerivedViewportChange(r, emissionsVolumeChart)}
								onviewportsettle={range.handleViewportSettle}
								panZoomMode="tap-to-engage"
								bind:panZoomEngaged
							/>
						{:else}
							<NetworkChart
								bind:this={emissionsIntensityChart}
								{region}
								metric="emissions_intensity"
								interval={range.activeInterval}
								displayInterval={range.displayInterval}
								chartKind="line"
								timeZone={tz}
								{dateStart}
								{dateEnd}
								title="Intensity"
								chartHeight="h-[160px]"
								showContainer={false}
								tooltipMode="strip"
								{hoverTime}
								onhoverchange={handleHoverChange}
								onviewportchange={(r) =>
									range.handleDerivedViewportChange(r, emissionsIntensityChart)}
								onviewportsettle={range.handleViewportSettle}
								panZoomMode="tap-to-engage"
								bind:panZoomEngaged
							/>
						{/if}
					</div>
				</section>
			</div>

			{#if noData}
				<div
					class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center"
				>
					<div class="rounded-full bg-light-warm-grey p-4 text-mid-grey">
						<LineChart size={24} strokeWidth={1.5} />
					</div>
					<p class="m-0 text-sm font-medium text-dark-grey">No data in this range</p>
				</div>
			{/if}
		</div>

		<!-- Corridor flow charts, shown inline so a region pick surfaces its flows
	     immediately — no click-through. Every InterconnectorChart shares one
	     corridor-agnostic fetch, so N corridors still cost one request; the
	     header row opens the full corridor view (flow + price + live stats). -->
		{#each regionInterconnectors as ic (ic.key)}
			<section class={engagedCardClass}>
				<button
					type="button"
					onclick={() => onselectinterconnector?.(ic.key)}
					class="group flex w-full cursor-pointer flex-col gap-1.5 px-4 pt-3 pb-1 text-left transition-colors hover:bg-light-warm-grey/60"
				>
					<div class="flex items-center justify-between gap-2">
						<h3 class="m-0 min-w-0 truncate text-sm font-semibold text-dark-grey">{ic.label}</h3>
						<ChevronRight
							size={16}
							class="shrink-0 text-mid-warm-grey transition-colors group-hover:text-mid-grey"
						/>
					</div>
					<div class="w-full">
						<CorridorMetrics interconnector={ic} {flows} />
					</div>
				</button>
				<div class="px-2 pb-2">
					<InterconnectorChart
						bind:this={flowCharts[ic.key]}
						interconnectorKey={ic.key}
						metric={flowMetric}
						interval={range.activeInterval}
						displayInterval={range.displayInterval}
						{dateStart}
						{dateEnd}
						title={range.activeMetric === 'energy' ? 'Energy' : 'Flow'}
						chartHeight="h-[120px]"
						tooltipMode="strip"
						{hoverTime}
						onhoverchange={handleHoverChange}
						onviewportchange={(r) => range.handleDerivedViewportChange(r, flowCharts[ic.key])}
						onviewportsettle={range.handleViewportSettle}
						panZoomMode="tap-to-engage"
						bind:panZoomEngaged
					/>
				</div>
			</section>
		{/each}
	</div>
</div>
