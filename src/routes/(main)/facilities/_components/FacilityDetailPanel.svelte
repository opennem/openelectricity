<script>
	import {
		FacilityChart,
		FacilityFinancialDataProvider,
		FacilityEmissionsDataProvider,
		FacilityMetrics,
		getNetworkTimezone
	} from '$lib/components/charts/facility';
	import { getHysteresisSwitch, getDisplayIntervalForDays } from '$lib/utils/metric-interval';
	import { hasBidirectionalBattery, filterDerivedBatteryUnits } from '../_utils/units';
	import FacilityUnitsLegend from './FacilityUnitsLegend.svelte';

	/**
	 * @type {{
	 *   facility: any | null,
	 *   sanityFacility?: any | null,
	 *   powerData: any | null,
	 *   fillHeight?: boolean
	 * }}
	 */
	let { facility = null, sanityFacility = null, powerData = null, fillHeight = false } = $props();

	let chartContainerHeight = $state(0);
	let chartHeightPx = $derived(fillHeight ? chartContainerHeight || 220 : 220);

	let timeZone = $derived(facility ? getNetworkTimezone(facility.network_id) : '+10:00');

	// 3 days at 5-minute intervals
	const LAST_3_DAYS_POINTS = 3 * 24 * 12;

	/** @type {string} */
	let activeInterval = $state('5m');
	/** @type {string} */
	let activeMetric = $state('power');
	/** @type {string} */
	let displayInterval = $state('30m');

	/** Live viewport reported by the chart — drives the metrics' date range and
	 *  the headless financial/emissions providers below. */
	let viewStart = $state(0);
	let viewEnd = $state(0);

	/** Visible-range data feeding the metrics section. */
	/** @type {{ mvData: any[], energyData: any[], mvSeriesNames: string[], energySeriesNames: string[] } | null} */
	let summaryData = $state(null);
	/** @type {{ rows: any[], seriesNames: string[] } | null} */
	let emissionsData = $state(null);
	/** @type {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null} */
	let intervalData = $state(null);

	/** @type {ReturnType<typeof setTimeout> | null} */
	let metricSwitchTimer = null;

	/** @param {{ start: number, end: number }} range */
	function handleViewportChange(range) {
		viewStart = range.start;
		viewEnd = range.end;
		const durationDays = (range.end - range.start) / (24 * 60 * 60 * 1000);
		const next = getHysteresisSwitch(activeMetric, activeInterval, durationDays);

		displayInterval = getDisplayIntervalForDays(
			next?.metric ?? activeMetric,
			next?.interval ?? activeInterval,
			durationDays
		);

		if (next) {
			if (metricSwitchTimer) clearTimeout(metricSwitchTimer);
			metricSwitchTimer = setTimeout(() => {
				activeMetric = next.metric;
				activeInterval = next.interval;
			}, 300);
		}
	}

	// Reset chart state only when the facility *actually* changes. The `facility`
	// prop is reassigned to a fresh object whenever the page's `data` updates
	// (power refetch, invalidation), so keying off the reference would re-run on
	// every update and clobber the viewStart/viewEnd the chart just reported —
	// starving the metrics providers. `viewStart`/`viewEnd` deliberately carry
	// over (a valid recent window) so the providers refetch for the new code.
	/** @type {string | null} */
	let lastFacilityCode = null;
	$effect(() => {
		const code = facility?.code ?? null;
		if (code === lastFacilityCode) return;
		lastFacilityCode = code;
		activeInterval = '5m';
		activeMetric = 'power';
		displayInterval = '30m';
		summaryData = null;
		emissionsData = null;
		intervalData = null;
	});

	/**
	 * @param {any[]} data
	 * @returns {any[]}
	 */
	function filterLastNPoints(data) {
		if (!data || data.length <= LAST_3_DAYS_POINTS) {
			return data;
		}
		return data.slice(-LAST_3_DAYS_POINTS);
	}

	let filteredUnits = $derived(
		filterDerivedBatteryUnits(facility?.units ?? [], hasBidirectionalBattery(facility))
	);
	let filteredUnitCodes = $derived(new Set(filteredUnits.map((/** @type {any} */ u) => u.code)));

	let filteredFacility = $derived(
		facility
			? {
					...facility,
					units: filteredUnits
				}
			: null
	);

	/** Whether any unit actually emits CO₂ — gates the (extra) emissions fetch. */
	let hasEmittingUnits = $derived(
		Boolean(
			filteredFacility?.units?.some(
				(/** @type {any} */ u) => Number(u.emissions_factor_co2) > 0 && u.dispatch_type !== 'LOAD'
			)
		)
	);

	let filteredPowerData = $derived(
		powerData && powerData.data.length
			? {
					...powerData,
					data: [
						{
							...powerData.data[0],
							results: powerData.data[0].results
								?.filter((/** @type {any} */ r) => filteredUnitCodes.has(r.columns?.unit_code))
								.map((/** @type {any} */ r) => ({
									...r,
									data: filterLastNPoints(r.data)
								}))
						}
					]
				}
			: null
	);
</script>

{#if facility}
	<div class={fillHeight ? 'flex flex-col h-full min-h-0' : ''}>
		<!-- Metrics — fuel-tech-appropriate summary for the visible chart range.
		     FacilityMetrics renders a flush grid, so wrap it in a bordered box here. -->
		{#if filteredFacility}
			<div class="{fillHeight ? 'shrink-0 ' : ''}border-b border-mid-warm-grey/40 p-3">
				<div class="overflow-hidden rounded-lg border border-mid-warm-grey/40">
					<FacilityMetrics
						facility={filteredFacility}
						{sanityFacility}
						{summaryData}
						{emissionsData}
						{intervalData}
					/>
				</div>
			</div>
		{/if}

		<!-- Power Chart — full-bleed, extends to the panel edges -->
		<div
			class={fillHeight ? 'flex-1 min-h-0 relative' : ''}
			bind:clientHeight={chartContainerHeight}
		>
			{#if filteredPowerData}
				<FacilityChart
					facility={filteredFacility}
					powerData={filteredPowerData}
					{timeZone}
					{chartHeightPx}
					useDivergingStack={true}
					interval={activeInterval}
					metric={activeMetric}
					{displayInterval}
					showAnnotations={false}
					showHeader={false}
					showContainer={false}
					tooltipMode="floating"
					tightAxisClip={true}
					overlayInsetPx={8}
					onviewportchange={handleViewportChange}
					onvisibledata={(d) => (intervalData = d)}
				/>
			{:else if powerData}
				<div class="flex items-center justify-center h-full" style:min-height="220px">
					<p class="text-sm text-mid-grey">No power data available</p>
				</div>
			{:else}
				<div
					class="animate-pulse bg-light-warm-grey/30 rounded h-full"
					style:min-height="220px"
				></div>
			{/if}
		</div>

		<!-- Units legend (single horizontal scrolling row) -->
		{#if filteredUnits.length}
			<div class={fillHeight ? 'shrink-0' : ''}>
				<FacilityUnitsLegend units={filteredUnits} />
			</div>
		{/if}

		<!-- Headless data providers — fetch market value (+ emissions) for the
		     visible range and feed the metrics above. They render no markup. -->
		{#if filteredFacility}
			<FacilityFinancialDataProvider
				facility={filteredFacility}
				{timeZone}
				interval={activeInterval}
				{displayInterval}
				{viewStart}
				{viewEnd}
				onsummarydata={(d) => (summaryData = d)}
			/>
			{#if hasEmittingUnits}
				<FacilityEmissionsDataProvider
					facility={filteredFacility}
					{timeZone}
					interval={activeInterval}
					{displayInterval}
					{viewStart}
					{viewEnd}
					onsummarydata={(d) => (emissionsData = d)}
				/>
			{/if}
		{/if}
	</div>
{/if}
