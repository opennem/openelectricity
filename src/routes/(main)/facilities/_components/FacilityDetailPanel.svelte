<script>
	import { FacilityChart, getNetworkTimezone } from '$lib/components/charts/facility';
	import { hasBidirectionalBattery, filterDerivedBatteryUnits } from '../_utils/units';
	import FacilityUnitsLegend from './FacilityUnitsLegend.svelte';

	/**
	 * @type {{
	 *   facility: any | null,
	 *   powerData: any | null
	 * }}
	 */
	let { facility = null, powerData = null } = $props();

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

	/**
	 * Auto-switch between power and energy based on zoom duration.
	 * @param {{ start: number, end: number }} range
	 */
	function handleViewportChange(range) {
		const durationDays = (range.end - range.start) / (24 * 60 * 60 * 1000);
		let targetMetric = activeMetric;
		let targetInterval = activeInterval;

		if (activeMetric === 'power' && durationDays >= 15) {
			targetMetric = 'energy';
			targetInterval = '1d';
		} else if (activeMetric === 'energy' && durationDays <= 13) {
			targetMetric = 'power';
			targetInterval = '5m';
		}

		if (activeMetric === 'power') {
			displayInterval = durationDays < 2 ? '5m' : '30m';
		} else if (activeMetric === 'energy') {
			displayInterval = durationDays >= 366 ? '1M' : '1d';
		}

		if (targetMetric !== activeMetric || targetInterval !== activeInterval) {
			if (metricSwitchTimer) clearTimeout(metricSwitchTimer);
			metricSwitchTimer = setTimeout(() => {
				activeMetric = targetMetric;
				activeInterval = targetInterval;
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
	<div>
		<!-- Power Chart — full-bleed, extends to the panel edges -->
		{#if filteredPowerData}
			<FacilityChart
				facility={filteredFacility}
				powerData={filteredPowerData}
				{timeZone}
				chartHeightPx={220}
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
			<div class="flex items-center justify-center" style="height: 220px">
				<p class="text-sm text-mid-grey">No power data available</p>
			</div>
		{:else}
			<div class="animate-pulse bg-light-warm-grey/30 rounded" style="height: 220px"></div>
		{/if}

		<!-- Units legend (single horizontal scrolling row) -->
		{#if filteredUnits.length}
			<FacilityUnitsLegend units={filteredUnits} />
		{/if}
	</div>
{/if}
