<script>
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import Meta from '$lib/components/Meta.svelte';

	// import FacilityStatusTable from './FacilityStatusTable.svelte';
	import FacilitiesMap from './FacilitiesMap.svelte';
	import Timeline from './Timeline.svelte';
	import Filters from './Filters.svelte';
	import FilterTags from './FilterTags.svelte';

	let { data } = $props();

	let facilities = $derived(data.facilities);
	let view = $derived(data.view);
	let statuses = $derived(data.statuses);
	let regions = $derived(data.regions);
	let fuelTechs = $derived(data.fuelTechs);

	let showTodayButton = $state(false);
	let todayButtonPosition = $state('bottom');
	/** @type {*} */
	let timelineRef = $state(null);

	let searchTerm = $state('');

	$inspect('view', view);
	$inspect('statuses', statuses);
	$inspect('regions', regions);
	$inspect('fuelTechs', fuelTechs);

	/**
	 * Filter out battery_charging and battery_discharging units from facilities
	 * @param {any[]} facilityList
	 * @param {string} searchTerm
	 * @returns {any[]}
	 */
	function filterBatteryUnits(facilityList, searchTerm) {
		return facilityList
			.map((facility) => ({
				...facility,
				units: facility.units?.filter(
					(/** @type {any} */ unit) =>
						unit.fueltech_id !== 'battery_charging' &&
						unit.fueltech_id !== 'battery_discharging' &&
						(searchTerm ? facility.name.toLowerCase().includes(searchTerm.toLowerCase()) : true)
				)
			}))
			.filter((facility) => facility.units && facility.units.length > 0);
	}

	let filteredFacilities = $derived(facilities ? filterBatteryUnits(facilities, searchTerm) : []);

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
			`/facilities/timeline?statuses=${statuses.join(',')}&regions=${regions.join(',')}&fuel_techs=${fuelTechs.join(',')}`,
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

	/**
	 * @param {boolean} visible
	 * @param {string} position
	 */
	function handleTodayButtonVisible(visible, position) {
		showTodayButton = visible;
		todayButtonPosition = position;
	}

	/**
	 * @param {string} value
	 */
	function handleSearchChange(value) {
		searchTerm = value;
	}
</script>

<Meta
	title="Facilities Timeline"
	description="Power generation facilities from Australia on a timeline."
	image="/img/facilities-preview.jpg"
/>

<div class="bg-light-warm-grey">
	<section class="md:container py-12">
		<div class="flex items-center gap-2 justify-start md:justify-center pl-10 pr-5 md:px-0">
			<h2 class="text-xl md:text-2xl mb-0">Facilities Timeline</h2>
			<span
				class="text-[10px] lowercase font-space font-medium text-light-warm-grey bg-gas rounded-full px-2 py-1"
			>
				Beta
			</span>
		</div>
	</section>
</div>

<!-- <section>
	<FacilitiesMap facilities={filteredWithLocation} />
</section> -->

<div class="border-y border-warm-grey">
	<div class="md:container relative text-base z-50">
		<Filters
			{searchTerm}
			selectedStatuses={statuses}
			selectedFuelTechs={fuelTechs}
			selectedRegions={regions}
			onsearchchange={handleSearchChange}
			onstatuseschange={handleStatusesChange}
			onregionschange={handleRegionsChange}
			onfueltechschange={handleFuelTechsChange}
		/>
	</div>
</div>
<div class="text-base">
	<div class="md:container md:grid grid-cols-8 md:divide-x divide-warm-grey py-12 relative">
		<div class="col-span-2 px-10 md:pl-7 md:pr-12">
			<div class="sticky top-10 hidden md:block">
				<FilterTags
					selectedRegions={regions}
					selectedStatuses={statuses}
					selectedFuelTechs={fuelTechs}
					onregionschange={handleRegionsChange}
					onstatuseschange={handleStatusesChange}
					onfueltechschange={handleFuelTechsChange}
				/>
			</div>
		</div>

		{#if showTodayButton && searchTerm.length === 0}
			<div
				class="fixed z-20 w-full flex justify-center"
				class:top-16={todayButtonPosition === 'top'}
				class:bottom-12={todayButtonPosition === 'bottom'}
				transition:fly={{ y: -10, duration: 300 }}
			>
				<button
					class="flex items-center gap-2 bg-chart-1 cursor-pointer text-white rounded-full text-xxs px-4 py-2 font-space shadow-sm hover:bg-chart-1/80 transition-all duration-300"
					onclick={() => timelineRef?.jumpToToday()}
				>
					{#if todayButtonPosition === 'bottom'}
						<span class="text-xxs">↓</span>
					{:else}
						<span class="text-xxs">↑</span>
					{/if}
					Jump to today
				</button>
			</div>
		{/if}
		<div class="col-span-6 md:pl-12 px-6">
			<Timeline
				bind:this={timelineRef}
				facilities={filteredWithLocation}
				ontodaybuttonvisible={handleTodayButtonVisible}
			/>
		</div>
	</div>
</div>

<!-- <div
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
</div> -->

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
