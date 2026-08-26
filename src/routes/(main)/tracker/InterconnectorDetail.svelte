<script>
	/**
	 * InterconnectorDetail — the content of the tracker's interconnector panel,
	 * layout-agnostic so the desktop ResizablePanel and the mobile BottomSheet
	 * host the same block.
	 *
	 * Live stat block (direction, MW, capacity fraction, adjacent-region price
	 * chips, dispatch time) from the page's grid-live poll store, then the
	 * corridor flow chart and the two adjacent regions' price chart driven by
	 * one createChartRangeControl state machine — the same pattern as
	 * FacilityCompactCharts. The host mounts this per selection (list → detail),
	 * but a corridor change on a live instance is just a series-name swap inside
	 * the charts (no refetch) — no {#key} needed either way; remounts still hit
	 * the module-level completed-response cache.
	 */

	import { untrack } from 'svelte';
	import { LineChart } from '@lucide/svelte';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { formatRangeLabel, ChartRangeBar } from '$lib/components/charts/v2';
	import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
	import { MIN_DATE } from '$lib/utils/date-range';
	import { ianaFromOffset, toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import InterconnectorChart from '$lib/components/charts/flows/InterconnectorChart.svelte';
	import { INTERCONNECTORS, getInterconnector } from '$lib/flows/region-geo.js';
	import CorridorMetrics from './CorridorMetrics.svelte';
	import PriceChipRow from './PriceChipRow.svelte';

	/**
	 * @type {{
	 *   interconnectorKey: string,
	 *   flows?: Record<string, number>,
	 *   prices?: Record<string, number>,
	 *   dispatchDateTimeString?: string
	 * }}
	 */
	let { interconnectorKey, flows = {}, prices = {}, dispatchDateTimeString = '' } = $props();

	const NEM_TZ = '+10:00';
	const DAY_MS = 24 * 60 * 60 * 1000;
	// 1 day picks up the 1D preset, whose default interval is the dispatch-level
	// 5m — the corridor panel is about what the interconnector is doing now.
	const INITIAL_RANGE_DAYS = 1;

	// Window end anchor — starts at mount (the host keeps this component
	// mounted across corridor switches, so the viewport carries over) and then
	// re-anchors on every new dispatch snapshot (see the live-edge effect), so
	// preset clicks and the calendar ceiling always mean "now", not mount time.
	const mountEnd = Date.now();
	let anchorEnd = $state(mountEnd);
	// The window start always trails the live anchor by the initial range.
	let anchorStart = $derived(anchorEnd - INITIAL_RANGE_DAYS * DAY_MS);
	// Initial chart viewport strings only — superseded once the load-complete
	// preset apply lands, so these deliberately stay at the mount anchor.
	const dateStart = toNetworkDateString(mountEnd - INITIAL_RANGE_DAYS * DAY_MS, NEM_TZ);
	const dateEnd = toNetworkDateString(mountEnd, NEM_TZ);

	const ianaTimeZone = ianaFromOffset(NEM_TZ);

	let ic = $derived(getInterconnector(interconnectorKey) ?? INTERCONNECTORS[0]);

	// ============================================
	// Range control + charts
	// ============================================

	let viewStart = $state(0);
	let viewEnd = $state(0);

	let dateRangeLabel = $derived.by(() => {
		const start = viewStart || anchorStart;
		const end = viewEnd || anchorEnd;
		return formatRangeLabel(start, end, range.displayInterval, ianaTimeZone);
	});

	/** @type {import('$lib/components/charts/flows/InterconnectorChart.svelte').default | undefined} */
	let flowChart = $state(undefined);
	/** @type {import('$lib/components/charts/flows/InterconnectorChart.svelte').default | undefined} */
	let priceChart = $state(undefined);

	const range = createChartRangeControl({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		defaultViewport: () => ({ start: anchorStart, end: anchorEnd }),
		setViewport: (startMs, endMs) => {
			viewStart = startMs;
			viewEnd = endMs;
		},
		charts: () => [flowChart, priceChart],
		timeZone: () => NEM_TZ,
		initialRangeDays: INITIAL_RANGE_DAYS
	});

	// Live-edge advance, keyed on the grid-live dispatch snapshot — the same
	// signal that updates the stat block, so the chart tail and the "as at"
	// figures tick forward together. The advance itself is untracked: it moves
	// the viewport and anchors, none of which may re-trigger this effect. The
	// mount-time snapshot is skipped — the window is already anchored there.
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
			// Pinned test reads the pre-advance anchor, so slide before re-anchoring
			// (anchorStart follows as a derived).
			range.advanceLiveEdge(newEnd);
			anchorEnd = newEnd;
		});
	});

	// The controller ladders power↔energy; the flow chart maps that onto the
	// OE flows metric pair. Price has no energy variant.
	let flowMetric = $derived(
		/** @type {'flows' | 'flows_energy'} */ (
			range.activeMetric === 'energy' ? 'flows_energy' : 'flows'
		)
	);

	// Load tracking — charts render immediately (they self-fetch); the empty
	// state replaces them only once the fetch confirms there's no data.
	let flowLoaded = $state(false);
	let flowHasData = $state(false);
	let noData = $derived(flowLoaded && !flowHasData);

	// Apply the default preset once the self-seeded window settles (same pattern
	// as FacilityCompactCharts) so the view matches a later 1D click exactly.
	let rangeApplied = false;

	/** @param {{ hasData: boolean }} state */
	function handleLoadComplete({ hasData }) {
		if (!rangeApplied) {
			rangeApplied = true;
			range.handleRangeSelect(INITIAL_RANGE_DAYS);
		}
		flowLoaded = true;
		flowHasData = hasData;
		range.settle();
	}

	// Shared hover so the flow and price charts track each other.
	/** @type {number | undefined} */
	let hoverTime = $state(undefined);

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		hoverTime = time;
	}

	/** Shared tap-to-engage pan/zoom across both charts — keeps wheel/drag from
	 *  hijacking the panel's scroll until the user opts in. */
	let panZoomEngaged = $state(false);
</script>

<div class="space-y-4 p-4">
	<!-- Live stat block -->
	<div class="space-y-2">
		<CorridorMetrics interconnector={ic} {flows} large />

		<PriceChipRow codes={[ic.from, ic.to]} {prices} {dispatchDateTimeString} />
	</div>

	<!-- Range toolbar (flat treatment — the panel surface is plain white) -->
	<div
		class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-warm-grey pt-3"
	>
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
			compact
			pending={range.rangeSwitchPending}
			onrangeselect={range.handleRangeSelect}
			ondaterangechange={range.handleDateRangeChange}
			onintervalchange={range.handleIntervalChange}
		/>
	</div>

	<!-- Charts stay mounted under the empty state (visibility, not display:none —
	     LayerCake needs a real size) so a later range pick can still recover. -->
	<div
		class={[
			'relative space-y-4',
			panZoomEngaged && 'rounded-xs outline outline-1 outline-dark-grey/40'
		]}
		use:clickoutside={{ event: 'pointerdown', options: true }}
		onclickoutside={() => (panZoomEngaged = false)}
	>
		<div class={['space-y-4', noData && 'invisible']}>
			<section>
				<InterconnectorChart
					bind:this={flowChart}
					interconnectorKey={ic.key}
					metric={flowMetric}
					interval={range.activeInterval}
					displayInterval={range.displayInterval}
					{dateStart}
					{dateEnd}
					title={range.activeMetric === 'energy' ? 'Energy' : 'Flow'}
					chartHeight="h-[180px]"
					tooltipMode="strip"
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(r) => range.handleDerivedViewportChange(r, flowChart)}
					onviewportsettle={range.handleViewportSettle}
					onloadcomplete={handleLoadComplete}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
				/>
			</section>

			<section>
				<InterconnectorChart
					bind:this={priceChart}
					interconnectorKey={ic.key}
					metric="price"
					interval={range.activeInterval}
					displayInterval={range.displayInterval}
					{dateStart}
					{dateEnd}
					title="Price"
					chartHeight="h-[140px]"
					tooltipMode="strip"
					{hoverTime}
					onhoverchange={handleHoverChange}
					onviewportchange={(r) => range.handleDerivedViewportChange(r, priceChart)}
					onviewportsettle={range.handleViewportSettle}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
				/>
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
</div>
