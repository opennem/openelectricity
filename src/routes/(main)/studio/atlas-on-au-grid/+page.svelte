<script>
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	// import FacilityStatusTable from './FacilityStatusTable.svelte';
	import FacilitiesMap from './FacilitiesMap.svelte';
	import Timeline from './Timeline.svelte';
	import Filters from './Filters.svelte';

	let { data } = $props();

	let facilities = $derived(data.facilities);
	let view = $derived(data.view);
	let statuses = $derived(data.statuses);
	let regions = $derived(data.regions);
	let fuelTechs = $derived(data.fuelTechs);

	$inspect('view', view);
	$inspect('statuses', statuses);
	$inspect('regions', regions);
	$inspect('fuelTechs', fuelTechs);

	/**
	 * Filter out battery_charging and battery_discharging units from facilities
	 * @param {any[]} facilityList
	 * @returns {any[]}
	 */
	function filterBatteryUnits(facilityList) {
		return facilityList
			.map((facility) => ({
				...facility,
				units: facility.units?.filter(
					(/** @type {any} */ unit) =>
						unit.fueltech_id !== 'battery_charging' && unit.fueltech_id !== 'battery_discharging'
				)
			}))
			.filter((facility) => facility.units && facility.units.length > 0);
	}

	let filteredFacilities = $derived(facilities ? filterBatteryUnits(facilities) : []);
	$inspect('filteredFacilities', filteredFacilities);

	/**
	 * Check if facility has valid location data
	 * @param {any} facility
	 * @returns {boolean}
	 */
	function hasValidLocation(facility) {
		return (
			facility.location &&
			typeof facility.location.lat === 'number' &&
			typeof facility.location.lng === 'number' &&
			!isNaN(facility.location.lat) &&
			!isNaN(facility.location.lng)
		);
	}

	/**
	 * Filter facilities with valid location data
	 * @param {any[]} facilityList
	 * @returns {any[]}
	 */
	function filterWithLocation(facilityList) {
		return facilityList.filter(hasValidLocation);
	}

	let filteredWithLocation = $derived(filterWithLocation(filteredFacilities));

	let uniqueFuelTechs = $derived([
		...new Set(
			facilities
				? facilities.map((facility) => facility.units.map((unit) => unit.fueltech_id)).flat()
				: []
		)
	]);
	let uniqueStatuses = $derived([
		...new Set(
			facilities
				? facilities.map((facility) => facility.units.map((unit) => unit.status_id)).flat()
				: []
		)
	]);
	let uniqueRegions = $derived([
		...new Set(facilities ? facilities.map((facility) => facility.network_region).flat() : [])
	]);
	let uniqueNetworkIds = $derived([
		...new Set(facilities ? facilities.map((facility) => facility.network_id).flat() : [])
	]);

	$inspect('uniqueFuelTechs', uniqueFuelTechs);
	$inspect('uniqueStatuses', uniqueStatuses);
	$inspect('uniqueRegions', uniqueRegions);
	$inspect('uniqueNetworkIds', uniqueNetworkIds);

	/**
	 * @param {{statuses: string[], regions: string[], fuelTechs: string[]}} param0
	 */
	function handleViewChange({ statuses, regions, fuelTechs }) {
		console.log('view', statuses, regions, fuelTechs);
		goto(
			`/studio/atlas-on-au-grid?statuses=${statuses.join(',')}&regions=${regions.join(',')}&fuel_techs=${fuelTechs.join(',')}`,
			{
				noScroll: true,
				invalidateAll: true
			}
		);
	}

	/**
	 * @param {string[]} values
	 */
	function handleRegionsChange(values) {
		handleViewChange({ statuses, regions: values, fuelTechs });
	}

	/**
	 * @param {string[]} values
	 */
	function handleFuelTechsChange(values) {
		handleViewChange({ statuses, regions, fuelTechs: values });
	}

	/**
	 * @param {string[]} values
	 */
	function handleStatusesChange(values) {
		handleViewChange({ statuses: values, regions, fuelTechs });
	}

	let showTodayButton = $state(false);
	/** @type {*} */
	let timelineRef = $state(null);

	/**
	 * @param {boolean} visible
	 * @param {string} position
	 */
	function handleTodayButtonVisible(visible, position) {
		showTodayButton = visible;
		// console.log('handleTodayButtonVisible', visible, position);
	}
</script>

<section>
	<!-- <div class="md:container">
		<Filters
			initialStatuses={statuses}
			onstatuseschange={handleStatusesChange}
			onregionschange={handleRegionsChange}
			onfueltechschange={handleFuelTechsChange}
		/>
	</div> -->
	<FacilitiesMap facilities={filteredWithLocation} />
</section>

<div
	class="z-10 bg-white absolute top-[138px] left-10 bottom-10 md:w-1/2 w-[calc(100vw-5rem)] overflow-hidden border border-warm-grey rounded-xl shadow-2xl"
>
	<div class="absolute top-0 z-50 bg-light-warm-grey w-full border-b border-warm-grey">
		<Filters
			initialStatuses={statuses}
			initialFuelTechs={fuelTechs}
			initialRegions={regions}
			onstatuseschange={handleStatusesChange}
			onregionschange={handleRegionsChange}
			onfueltechschange={handleFuelTechsChange}
		/>
	</div>

	{#if showTodayButton}
		<div
			class="absolute top-36 z-20 w-full flex justify-center"
			transition:fly={{ y: -10, duration: 300 }}
		>
			<button
				class="bg-chart-1 cursor-pointer text-white rounded-full text-xxs px-4 py-2 font-space shadow-sm hover:bg-chart-1/80 transition-all duration-300"
				onclick={() => timelineRef?.jumpToToday()}
			>
				Jump to today
			</button>
		</div>
	{/if}
	<div class="overflow-y-auto absolute top-[54px] left-0 right-0 bottom-0">
		<Timeline
			bind:this={timelineRef}
			facilities={filteredWithLocation}
			ontodaybuttonvisible={handleTodayButtonVisible}
		/>
	</div>
	<div class="overflow-y-auto">
		<!-- <FacilityStatusTable
			facilities={filteredCommittedFacilities}
			statusLabel="Committed"
			statusType="committed"
		/>

		<FacilityStatusTable
			facilities={filteredOperationalFacilities}
			statusLabel="Operating"
			statusType="operating"
		/>

		<FacilityStatusTable
			facilities={filteredRetiredFacilities}
			statusLabel="Retired"
			statusType="retired"
		/> -->
	</div>
</div>
