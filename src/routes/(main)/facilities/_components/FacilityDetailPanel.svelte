<script>
	import { FacilityChart, getNetworkTimezone } from '$lib/components/charts/facility';
	import { computeMetricSwitch } from '$lib/components/charts/facility/metric-switch.js';
	import { hasBidirectionalBattery, filterDerivedBatteryUnits } from '../_utils/units';
	import FacilityUnitsLegend from './FacilityUnitsLegend.svelte';

	/**
	 * @type {{
	 *   facility: any | null,
	 *   powerData: any | null,
	 *   fillHeight?: boolean
	 * }}
	 */
	let { facility = null, powerData = null, fillHeight = false } = $props();

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

	/** @type {ReturnType<typeof setTimeout> | null} */
	let metricSwitchTimer = null;

	/** @param {{ start: number, end: number }} range */
	function handleViewportChange(range) {
		const durationDays = (range.end - range.start) / (24 * 60 * 60 * 1000);
		const next = computeMetricSwitch({
			metric: activeMetric,
			interval: activeInterval,
			durationDays
		});

		displayInterval = next.displayInterval;

		if (next.changed) {
			if (metricSwitchTimer) clearTimeout(metricSwitchTimer);
			metricSwitchTimer = setTimeout(() => {
				activeMetric = next.metric;
				activeInterval = next.interval;
			}, 300);
		}
	}

	$effect(() => {
		const _fac = facility?.code;
		activeInterval = '5m';
		activeMetric = 'power';
		displayInterval = '30m';
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
	</div>
{/if}
