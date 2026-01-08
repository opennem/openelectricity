<script>
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import Meta from '$lib/components/Meta.svelte';
	import formatValue from '../_utils/format-value';
	import { statusColours } from '../_utils/filters.js';

	import Map from './Map.svelte';
	import Timeline from './Timeline.svelte';
	import Filters from './Filters.svelte';
	import List from './List.svelte';

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
	/** @type {HTMLElement | null} */
	let timelineScrollContainer = $state(null);

	let searchTerm = $state('');
	/** @type {any | null} */
	let hoveredFacility = $state(null);
	/** @type {'list' | 'timeline'} */
	let selectedView = $state('timeline');

	/**
	 * Filter out battery_charging and battery_discharging units from facilities since they are merged into battery.
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
				? facilities
						.map((facility) => facility.units.map((/** @type {any} */ unit) => unit.fueltech_id))
						.flat()
				: []
		)
	]);
	let uniqueStatuses = $derived([
		...new Set(
			facilities
				? facilities
						.map((facility) => facility.units.map((/** @type {any} */ unit) => unit.status_id))
						.flat()
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

	// Test for max_generation fields
	let allUnits = $derived(facilities?.flatMap((f) => f.units) ?? []);
	$inspect('All units:', allUnits);
	$inspect(
		'Units with max_generation:',
		allUnits.filter((u) => u.max_generation !== undefined)
	);
	$inspect(
		'Units with max_generation_interval:',
		allUnits.filter((u) => u.max_generation_interval !== undefined)
	);

	// Calculate totals for filtered facilities
	let filteredUnits = $derived(filteredFacilities?.flatMap((f) => f.units) ?? []);
	let totalCapacityMW = $derived(
		filteredUnits.reduce(
			(sum, u) => sum + (Number(u.capacity_maximum) || Number(u.capacity_registered) || 0),
			0
		)
	);
	let totalFacilitiesCount = $derived(filteredFacilities?.length ?? 0);
	let totalUnitsCount = $derived(filteredUnits?.length ?? 0);

	// Calculate capacity by status
	/**
	 * @param {string} status
	 * @returns {number}
	 */
	function getCapacityByStatus(status) {
		return filteredUnits
			.filter((u) => u.status_id === status)
			.reduce(
				(sum, u) => sum + (Number(u.capacity_maximum) || Number(u.capacity_registered) || 0),
				0
			);
	}
	let capacityByStatus = $derived({
		operating: getCapacityByStatus('operating'),
		commissioning: getCapacityByStatus('commissioning'),
		committed: getCapacityByStatus('committed'),
		retired: getCapacityByStatus('retired')
	});

	/**
	 * @param {{statuses: string[], regions: string[], fuelTechs: string[]}} param0
	 */
	function handleViewChange({ statuses, regions, fuelTechs }) {
		console.log('view', statuses, regions, fuelTechs);
		goto(
			`/facilities/all?statuses=${statuses.join(',')}&regions=${regions.join(',')}&fuel_techs=${fuelTechs.join(',')}`,
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
	title="Facilities"
	description="Power generation facilities in Australia."
	image="/img/facilities-preview.jpg"
/>

<!-- <div class="bg-light-warm-grey">
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
</div> -->

<div class="border-y border-warm-grey">
	<div class="md:container relative text-base z-50">
		<Filters
			{searchTerm}
			{selectedView}
			selectedStatuses={statuses}
			selectedFuelTechs={fuelTechs}
			selectedRegions={regions}
			onsearchchange={handleSearchChange}
			onstatuseschange={handleStatusesChange}
			onregionschange={handleRegionsChange}
			onfueltechschange={handleFuelTechsChange}
			onviewchange={(/** @type {'list' | 'timeline'} */ v) => (selectedView = v)}
		/>
	</div>
</div>

<section class="relative h-[calc(100vh-118px)]">
	<!-- Map -->
	<div class="absolute inset-0">
		<Map facilities={filteredWithLocation} {hoveredFacility} />
	</div>

	{#snippet summaryBar()}
		<div
			class="z-20 bg-white border-t border-warm-grey px-4 py-3 flex items-center justify-between gap-4"
		>
			<div class="flex items-center gap-4 text-xs font-space">
				<div class="flex items-center gap-1.5">
					<span class="text-mid-grey">{totalFacilitiesCount.toLocaleString()}</span>
					<span class="text-mid-grey">facilities</span>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="text-mid-grey">{totalUnitsCount.toLocaleString()}</span>
					<span class="text-mid-grey">units</span>
				</div>
			</div>
			<div class="flex items-center gap-3 text-xs">
				{#if capacityByStatus.operating > 0}
					<div class="flex items-center gap-1.5" title="Operating">
						<span class="w-2 h-2 rounded-full" style="background-color: {statusColours.operating};"
						></span>
						<span class="font-mono text-dark-grey">{formatValue(capacityByStatus.operating)}</span>
					</div>
				{/if}
				{#if capacityByStatus.commissioning > 0}
					<div class="flex items-center gap-1.5" title="Commissioning">
						<span
							class="w-2 h-2 rounded-full"
							style="background-color: {statusColours.commissioning};"
						></span>
						<span class="font-mono text-dark-grey"
							>{formatValue(capacityByStatus.commissioning)}</span
						>
					</div>
				{/if}
				{#if capacityByStatus.committed > 0}
					<div class="flex items-center gap-1.5" title="Committed">
						<span class="w-2 h-2 rounded-full" style="background-color: {statusColours.committed};"
						></span>
						<span class="font-mono text-dark-grey">{formatValue(capacityByStatus.committed)}</span>
					</div>
				{/if}
				{#if capacityByStatus.retired > 0}
					<div class="flex items-center gap-1.5" title="Retired">
						<span class="w-2 h-2 rounded-full" style="background-color: {statusColours.retired};"
						></span>
						<span class="font-mono text-dark-grey">{formatValue(capacityByStatus.retired)}</span>
					</div>
				{/if}
				<div class="flex items-center gap-1.5 pl-2 border-l border-warm-grey">
					<span class="font-mono font-medium text-dark-grey">{formatValue(totalCapacityMW)}</span>
					<span class="text-mid-grey">MW</span>
				</div>
			</div>
		</div>
	{/snippet}

	{#if selectedView === 'list'}
		<!-- Floating list panel on the left -->
		<div
			class="absolute top-6 left-6 right-6 bottom-6 md:right-auto md:w-[calc(50%-3rem)] bg-white rounded-xl shadow-lg z-10 overflow-hidden flex flex-col"
		>
			<div class="flex-1 overflow-y-auto">
				<List facilities={filteredFacilities} onhover={(f) => (hoveredFacility = f)} />
			</div>
			{@render summaryBar()}
		</div>
	{:else}
		<!-- Floating timeline panel on the left -->
		<div
			class="absolute top-6 left-6 right-6 bottom-6 md:right-auto md:w-[calc(50%-3rem)] bg-white rounded-xl shadow-lg z-10 overflow-hidden flex flex-col"
		>
			{#if showTodayButton && searchTerm.length === 0}
				<div
					class="absolute z-20 w-full flex justify-center pointer-events-none"
					class:top-4={todayButtonPosition === 'top'}
					class:bottom-16={todayButtonPosition === 'bottom'}
					transition:fly={{ y: -10, duration: 300 }}
				>
					<button
						class="flex items-center gap-2 bg-chart-1 cursor-pointer text-white rounded-full text-xxs px-4 py-2 font-space shadow-sm hover:bg-chart-1/80 transition-all duration-300 pointer-events-auto"
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
			<div class="flex-1 overflow-y-auto" bind:this={timelineScrollContainer}>
				<div class="p-6">
					<Timeline
						bind:this={timelineRef}
						facilities={filteredWithLocation}
						ontodaybuttonvisible={handleTodayButtonVisible}
						scrollContainer={timelineScrollContainer}
						onhover={(f) => (hoveredFacility = f)}
					/>
				</div>
			</div>
			{@render summaryBar()}
		</div>
	{/if}
</section>
