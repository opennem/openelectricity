<script>
	/**
	 * FacilityCompactCharts — the compact, interactive Generation + Price chart
	 * block shared by the /facility/[code] unit detail sheet and the /facilities
	 * selected-facility pane. It carries its own range presets, interval dropdown
	 * and date picker (independent of the facility page's controls) plus
	 * tap-to-engage pan/zoom — driven by the same createChartRangeControl state
	 * machine as the facility page — and an options menu with CSV downloads.
	 *
	 * `facility` is whatever the host wants charted: the full facility on the
	 * /facilities pane, or the single-unit clone built by UnitDetail (the charts
	 * fetch the whole facility's series and plot the supplied units').
	 *
	 * Hosts should `{#key}` this component on the facility/unit code so the range
	 * controller and load-tracking state reset when the subject changes.
	 */

	import { LineChart } from '@lucide/svelte';
	import FacilityChart from './FacilityChart.svelte';
	import FacilityPriceChart from './FacilityPriceChart.svelte';
	import FacilityFinancialDataProvider from './FacilityFinancialDataProvider.svelte';
	import {
		formatDateRange,
		ChartPanZoomHint,
		ChartRangeBar,
		toolbarTrayClass
	} from '$lib/components/charts/v2';
	import { createChartRangeControl } from './chart-range-control.svelte.js';
	import { dataEndMs } from './data-end.js';
	import { capYTicks } from './helpers.js';
	import { MIN_DATE, getEarliestDate } from '$lib/utils/date-range';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import { chartDownloadItems, downloadChartCsv } from './facility-csv.js';
	import { rangeSlugFor } from './range-params.js';

	/**
	 * `fileCode` names the CSV downloads (defaults to the facility code; the unit
	 * sheet passes the unit's code). `onsummarydata` forwards the financial
	 * provider's visible-range energy + market-value summary up to the host —
	 * UnitDetail derives the unit's Capacity Factor from it.
	 * @type {{
	 *   facility: any,
	 *   timeZone: string,
	 *   rangeDays?: number,
	 *   fileCode?: string,
	 *   onsummarydata?: (data: any) => void
	 * }}
	 */
	let {
		facility,
		timeZone,
		rangeDays = 3,
		fileCode = undefined,
		onsummarydata = undefined
	} = $props();

	const DAY_MS = 24 * 60 * 60 * 1000;

	// Window end anchor: "now", or the last-seen/closure date for a retired unit.
	let defaultEnd = $derived(dataEndMs(facility?.units ?? []));
	let defaultStart = $derived(defaultEnd - rangeDays * DAY_MS);

	let dateStart = $derived(toNetworkDateString(defaultStart, timeZone));
	let dateEnd = $derived(toNetworkDateString(defaultEnd, timeZone));

	let viewStart = $state(0);
	let viewEnd = $state(0);

	// Toolbar label mirrors the facility page: the live viewport once the
	// charts have seeded it, the default window before then.
	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	let dateRangeLabel = $derived.by(() => {
		const start = viewStart || defaultStart;
		const end = viewEnd || defaultEnd;
		return formatDateRange(new Date(start), new Date(end), ianaTimeZone, {
			yearIfNotCurrent: true
		});
	});

	/** @type {import('$lib/components/charts/facility/FacilityChart.svelte').default | undefined} */
	let powerChart = $state(undefined);

	/** Visible-range data captured for the CSV downloads in the options menu:
	 *  generation rows from the chart, energy + market value from the financial
	 *  provider (whose summary also forwards up to UnitDetail via `onsummarydata`).
	 *  $state.raw — replaced wholesale, only ever read; the datasets are too
	 *  large to deep-proxy. */
	/** @type {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null} */
	let intervalData = $state.raw(null);
	/** @type {{ mvData: any[], energyData: any[], mvSeriesNames: string[], energySeriesNames: string[] } | null} */
	let summaryData = $state.raw(null);

	/** @param {any} d */
	function handleSummaryData(d) {
		summaryData = d;
		onsummarydata?.(d);
	}

	/** Earliest data point for this unit — floor for the date picker + All preset. */
	let earliestDate = $derived(getEarliestDate(facility?.units ?? []));

	const range = createChartRangeControl({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		defaultViewport: () => ({ start: defaultStart, end: defaultEnd }),
		setViewport: (startMs, endMs) => {
			viewStart = startMs;
			viewEnd = endMs;
		},
		chart: () => powerChart,
		timeZone: () => timeZone,
		earliestDate: () => earliestDate,
		// Initial value by design — the controller is created once per mount
		// (the host {#key}s this component on its facility/unit code).
		// svelte-ignore state_referenced_locally
		initialRangeDays: rangeDays
	});

	/** @param {string} key */
	function handleDownload(key) {
		downloadChartCsv(key, {
			intervalData,
			summaryData,
			facility,
			metric: range.activeMetric,
			timeZone,
			fileCode,
			rangeSlug: rangeSlugFor(range)
		});
	}

	// Load tracking — charts render immediately (they self-fetch); the empty
	// state replaces them only once the fetch confirms there's no data.
	let powerLoaded = $state(false);
	let powerHasData = $state(false);
	let noData = $derived(powerLoaded && !powerHasData);

	// Apply the default preset once the self-seeded window settles (same pattern
	// as the facility page) so the view matches a later 3D click exactly.
	let rangeApplied = false;

	/** @param {{ hasData: boolean }} state */
	function handleLoadComplete({ hasData }) {
		if (!rangeApplied) {
			rangeApplied = true;
			range.handleRangeSelect(rangeDays);
		}
		powerLoaded = true;
		powerHasData = hasData;
		range.settle();
	}

	// Shared hover + focus so the Generation and Price charts track each other.
	/** @type {number | undefined} */
	let hoverTime = $state(undefined);
	/** @type {number | undefined} */
	let focusTime = $state(undefined);

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	/** @param {number | undefined} time */
	function handleFocusChange(time) {
		focusTime = time;
	}

	/** Shared tap-to-engage pan/zoom across both charts — keeps wheel/drag from
	 *  hijacking the sheet's scroll until the user opts in. */
	let panZoomEngaged = $state(false);
</script>

<div class="space-y-4">
	<!-- Recessed toolbar tray: the light well carries the date-range label while
	     the controls float on it as raised white chips (`raised`) — the same
	     track-and-thumb depth story as SwitchWithIcons, scaled to the row. -->
	<div class="{toolbarTrayClass} rounded-lg p-2 pl-4">
		<span class="text-base font-medium text-dark-grey">{dateRangeLabel}</span>
		<div class="flex items-center gap-1.5">
			<ChartRangeBar
				selectedRange={range.selectedRange}
				customDays={range.customDays}
				displayInterval={range.displayInterval}
				startDate={range.pickerStartDate}
				endDate={range.pickerEndDate}
				minDate={MIN_DATE}
				maxDate={range.maxDate}
				{earliestDate}
				showIntervalDropdown={true}
				compact
				raised
				pending={range.rangeSwitchPending}
				onrangeselect={range.handleRangeSelect}
				ondaterangechange={range.handleDateRangeChange}
				onintervalchange={range.handleIntervalChange}
			/>
			<!-- No emissions entry (this block has no emissions provider). Copy link
			     copies the host page's URL (?unit= deep link on the unit sheet, the
			     selected-facility URL on /facilities). -->
			<PageOptionsMenu
				downloadItems={chartDownloadItems()}
				ondownloaditem={handleDownload}
				showCopyLink
				showDocumentation={false}
				triggerClass="p-2 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
			/>
		</div>
	</div>

	<!-- Charts stay mounted under the empty state (visibility, not display:none —
	     LayerCake needs a real size) so a later range/preset pick can still fetch
	     and recover. `group/charts` scopes the shared pan/zoom hint's hover
	     reveal to the charts block. -->
	<div class="group/charts relative space-y-4">
		<div class={['space-y-4', noData && 'invisible']}>
			<section>
				<!-- One shared interaction hint for the whole tap-to-engage stack —
				     both charts ride the same `panZoomEngaged` flag, so their built-in
				     per-chart pills are disabled (showPanZoomHint={false}) and this
				     single pill above the first chart covers them together. -->
				<div class="mb-2 flex items-center justify-between gap-4">
					<h3 class="m-0 text-xs font-semibold uppercase tracking-wide text-mid-grey">
						{range.activeMetric === 'energy' ? 'Energy' : 'Generation'}
					</h3>
					<ChartPanZoomHint
						engaged={panZoomEngaged}
						onengage={() => (panZoomEngaged = true)}
						onexit={() => (panZoomEngaged = false)}
						class={panZoomEngaged
							? ''
							: 'opacity-0 group-hover/charts:opacity-100 transition-opacity duration-150'}
					/>
				</div>
				<FacilityChart
					bind:this={powerChart}
					{facility}
					powerData={null}
					{timeZone}
					{dateStart}
					{dateEnd}
					interval={range.activeInterval}
					metric={range.activeMetric}
					displayInterval={range.displayInterval}
					chartHeight="h-[180px]"
					title={range.activeMetric === 'energy' ? 'Energy' : 'Power'}
					showHeader={false}
					showOptions={false}
					showZoomControls={false}
					resizable={false}
					yTicks={capYTicks}
					showContainer={false}
					tooltipMode="floating"
					{hoverTime}
					onhoverchange={handleHoverChange}
					{focusTime}
					onfocuschange={handleFocusChange}
					onviewportchange={range.handleChartViewportChange}
					onviewportsettle={range.handleViewportSettle}
					onloadcomplete={handleLoadComplete}
					onvisibledata={(d) => {
						intervalData = d;
						range.settle();
					}}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
					showPanZoomHint={false}
					bundleDerivedMetrics
					prefetchRanges={false}
				/>
			</section>

			{#if viewStart && viewEnd}
				<section>
					<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">
						Price
					</h3>
					<FacilityFinancialDataProvider
						{facility}
						{timeZone}
						interval={range.activeInterval}
						displayInterval={range.displayInterval}
						{viewStart}
						{viewEnd}
						priceChartHeight="h-[140px]"
						{hoverTime}
						onhoverchange={handleHoverChange}
						{focusTime}
						onfocuschange={handleFocusChange}
						onviewportchange={range.handleDerivedViewportChange}
						onviewportsettle={range.handleViewportSettle}
						reconcileSeq={range.reconcileSeq}
						onsummarydata={handleSummaryData}
					>
						<FacilityPriceChart
							showContainer={false}
							showHeader={false}
							resizable={false}
							panZoomMode="tap-to-engage"
							bind:panZoomEngaged
							showPanZoomHint={false}
						/>
					</FacilityFinancialDataProvider>
				</section>
			{/if}
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
</div>
