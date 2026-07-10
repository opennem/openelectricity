<script>
	/**
	 * UnitCharts — interactive Generation + Price charts for the unit detail
	 * sheet. Unlike the static FacilitySnapshotCharts, these carry their own
	 * range presets, interval dropdown and date picker (independent of the main
	 * page's controls) plus tap-to-engage pan/zoom — driven by the same
	 * createChartRangeControl state machine as the facility page.
	 *
	 * `facility` is the single-unit clone built by UnitDetail; the charts fetch
	 * the whole facility's series and plot only this unit's.
	 */

	import { LineChart } from '@lucide/svelte';
	import {
		FacilityChart,
		FacilityPriceChart,
		FacilityFinancialDataProvider
	} from '$lib/components/charts/facility';
	import { formatDateRange, ChartRangeBar } from '$lib/components/charts/v2';
	import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
	import { dataEndMs } from '$lib/components/charts/facility/data-end.js';
	import { capYTicks } from '$lib/components/charts/facility/helpers.js';
	import { MIN_DATE, getEarliestDate } from '$lib/utils/date-range';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import OptionsMenu from '../../../facilities/_components/OptionsMenu.svelte';
	import { chartDownloadItems, downloadChartCsv } from '../_utils/facility-csv.js';
	import { rangeSlugFor } from '../_utils/range-params.js';

	/**
	 * `onsummarydata` forwards the financial provider's visible-range energy +
	 * market-value summary up to UnitDetail, which derives the unit's Capacity
	 * Factor from it.
	 * @type {{
	 *   facility: any,
	 *   timeZone: string,
	 *   rangeDays?: number,
	 *   onsummarydata?: (data: any) => void
	 * }}
	 */
	let { facility, timeZone, rangeDays = 3, onsummarydata = undefined } = $props();

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

	/** The single unit's code — the sheet's facility is a one-unit clone. */
	let unitCode = $derived(facility?.units?.[0]?.code);

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
		// ({#key}ed on the unit).
		// svelte-ignore state_referenced_locally
		initialRangeDays: rangeDays
	});

	$effect(() => {
		return () => range.dispose();
	});

	/** @param {string} key */
	function handleDownload(key) {
		downloadChartCsv(key, {
			intervalData,
			summaryData,
			facility,
			metric: range.activeMetric,
			timeZone,
			fileCode: unitCode,
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
	<div class="flex flex-wrap items-center justify-between gap-4">
		<span class="font-space text-base font-medium text-dark-grey">{dateRangeLabel}</span>
		<div class="flex items-center gap-1">
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
				pending={range.rangeSwitchPending}
				onrangeselect={range.handleRangeSelect}
				ondaterangechange={range.handleDateRangeChange}
				onintervalchange={range.handleIntervalChange}
			/>
			<!-- No emissions entry (the sheet has no emissions provider). Copy link
			     copies the unit deep-link (?unit=). -->
			<OptionsMenu
				downloadItems={chartDownloadItems()}
				ondownloaditem={handleDownload}
				showCopyLink
				showDocumentation={false}
			/>
		</div>
	</div>

	<!-- Charts stay mounted under the empty state (visibility, not display:none —
	     LayerCake needs a real size) so a later range/preset pick can still fetch
	     and recover. -->
	<div class="relative space-y-4">
		<div class={['space-y-4', noData && 'invisible']}>
			<section>
				<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">
					{range.activeMetric === 'energy' ? 'Energy' : 'Generation'}
				</h3>
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
					onloadcomplete={handleLoadComplete}
					onvisibledata={(d) => {
						intervalData = d;
						range.settle();
					}}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
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
						onsummarydata={handleSummaryData}
					>
						<FacilityPriceChart
							showContainer={false}
							showHeader={false}
							resizable={false}
							panZoomMode="tap-to-engage"
							bind:panZoomEngaged
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
