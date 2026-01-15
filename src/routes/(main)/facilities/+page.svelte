<script>
	import { fly } from 'svelte/transition';
	import { goto, replaceState } from '$app/navigation';
	import Meta from '$lib/components/Meta.svelte';
	import formatValue from './_utils/format-value';
	import { statusColours, isInSizeRange } from './_utils/filters.js';

	import Map from './Map.svelte';
	import Timeline from './Timeline.svelte';
	import Filters from './Filters.svelte';
	import List from './List.svelte';
	import StatusCapacityBadge from './StatusCapacityBadge.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';

	let { data } = $props();

	// Server data (updates when server responds)
	let facilities = $derived(data.facilities);

	// Optimistic local state for filters - updates immediately on user interaction
	/** @type {string[]} */
	let statuses = $state(data.statuses);
	/** @type {string[]} */
	let regions = $state(data.regions);
	/** @type {string[]} */
	let fuelTechs = $state(data.fuelTechs);
	/** @type {string[]} */
	let sizes = $state(data.sizes);
	/** @type {'list' | 'timeline' | 'map'} */
	let selectedView = $state(/** @type {'list' | 'timeline' | 'map'} */ (data.view));
	/** @type {string | null} */
	let selectedFacilityCode = $state(data.selectedFacility);

	// Sync local state when server data changes (e.g., browser back/forward, direct URL navigation)
	$effect(() => {
		statuses = data.statuses;
		regions = data.regions;
		fuelTechs = data.fuelTechs;
		sizes = data.sizes;
		selectedView = /** @type {'list' | 'timeline' | 'map'} */ (data.view);
		selectedFacilityCode = data.selectedFacility;
	});

	let showTodayButton = $state(false);
	let todayButtonPosition = $state('bottom');
	/** @type {*} */
	let timelineRef = $state(null);
	/** @type {HTMLElement | null} */
	let timelineScrollContainer = $state(null);

	let searchTerm = $state('');
	/** @type {any | null} */
	let hoveredFacility = $state(null);
	/** @type {any | null} */
	let clickedFacility = $state(null);

	// Map clustering toggle and ref
	let mapClustering = $state(false);
	/** @type {*} */
	let mapRef = $state(null);

	/**
	 * Filter out battery_charging and battery_discharging units from facilities since they are merged into battery.
	 * @param {any[]} facilityList
	 * @param {string} searchTerm
	 * @param {string[]} selectedSizes
	 * @returns {any[]}
	 */
	function filterFacilities(facilityList, searchTerm, selectedSizes) {
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
			.filter((facility) => facility.units && facility.units.length > 0)
			.filter((facility) => {
				// Calculate total capacity for the facility
				const totalCapacity = facility.units.reduce(
					(/** @type {number} */ sum, /** @type {any} */ unit) =>
						sum + (Number(unit.capacity_maximum) || Number(unit.capacity_registered) || 0),
					0
				);
				return isInSizeRange(totalCapacity, selectedSizes);
			});
	}

	let filteredFacilities = $derived(
		facilities ? filterFacilities(facilities, searchTerm, sizes) : []
	);

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
	 * Build URL from params
	 * @param {{statuses: string[], regions: string[], fuelTechs: string[], sizes: string[], view: string, facility?: string | null}} params
	 * @returns {string}
	 */
	function buildUrl({ statuses: s, regions: r, fuelTechs: ft, sizes: sz, view: v, facility: f = null }) {
		let url = `/facilities?view=${v}&statuses=${s.join(',')}&regions=${r.join(',')}&fuel_techs=${ft.join(',')}&sizes=${sz.join(',')}`;
		if (f) {
			url += `&facility=${f}`;
		}
		return url;
	}

	/**
	 * Navigate and refetch data (for filter changes that affect API query)
	 * @param {{statuses: string[], regions: string[], fuelTechs: string[], sizes: string[], view: string, facility?: string | null}} params
	 */
	function navigateWithRefetch(params) {
		goto(buildUrl(params), {
			noScroll: true,
			invalidateAll: true
		});
	}

	/**
	 * Update URL without refetch (for view/facility/size changes that use cached data)
	 * Uses replaceState to avoid triggering the load function
	 * @param {{statuses: string[], regions: string[], fuelTechs: string[], sizes: string[], view: string, facility?: string | null}} params
	 */
	function navigateWithoutRefetch(params) {
		replaceState(buildUrl(params), {});
	}

	/**
	 * @param {string[]} values
	 */
	function handleRegionsChange(values) {
		// Optimistic update - immediately update local state
		regions = values;
		// Then navigate to fetch new data (filter change requires refetch)
		navigateWithRefetch({ statuses, regions: values, fuelTechs, sizes, view: selectedView });
	}

	/**
	 * @param {string[]} values
	 */
	function handleFuelTechsChange(values) {
		// Optimistic update
		fuelTechs = values;
		// Filter change requires refetch
		navigateWithRefetch({ statuses, regions, fuelTechs: values, sizes, view: selectedView });
	}

	/**
	 * @param {string[]} values
	 */
	function handleStatusesChange(values) {
		// Optimistic update
		statuses = values;
		// Filter change requires refetch
		navigateWithRefetch({ statuses: values, regions, fuelTechs, sizes, view: selectedView });
	}

	/**
	 * @param {string[]} values
	 */
	function handleSizesChange(values) {
		// Optimistic update
		sizes = values;
		// Size is client-side filtered, no refetch needed
		navigateWithoutRefetch({ statuses, regions, fuelTechs, sizes: values, view: selectedView });
	}

	/**
	 * @param {'list' | 'timeline' | 'map'} value
	 */
	function handleSelectedViewChange(value) {
		// Optimistic update
		selectedView = value;
		// View change uses cached data, no refetch needed
		navigateWithoutRefetch({ statuses, regions, fuelTechs, sizes, view: value, facility: selectedFacilityCode });
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

	/**
	 * Handle facility selection - toggles selection if already selected
	 * @param {any} facility
	 */
	function handleFacilitySelect(facility) {
		if (facility) {
			if (selectedFacilityCode === facility.code) {
				// Toggle off - clear selection and close popups
				selectedFacilityCode = null;
				mapRef?.closePopups();
				// Facility selection uses cached data, no refetch needed
				navigateWithoutRefetch({ statuses, regions, fuelTechs, sizes, view: selectedView, facility: null });
			} else {
				// Select new facility
				selectedFacilityCode = facility.code;
				// Facility selection uses cached data, no refetch needed
				navigateWithoutRefetch({ statuses, regions, fuelTechs, sizes, view: selectedView, facility: facility.code });
			}
		}
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
			<h2 class="text-xl md:text-2xl mb-0">Facilities</h2>
			<span
				class="text-[10px] lowercase font-space font-medium text-light-warm-grey bg-gas rounded-full px-2 py-1"
			>
				Beta
			</span>
		</div>
	</section>
</div> -->

<PageHeaderSimple>
	<!-- @migration-task: migrate this slot by hand, `main-heading` is an invalid identifier -->
	<div slot="main-heading">
		<h1 class="tracking-widest text-center">Facilities</h1>
	</div>
	<!-- @migration-task: migrate this slot by hand, `sub-heading` is an invalid identifier -->
	<div slot="sub-heading">
		<p class="text-sm text-center w-full md:w-[610px] mx-auto">
			Explore Australia's power generation facilities across the NEM and WEM. View upcoming projects
			on the timeline, browse the full list of facilities, or discover their locations on the map.
		</p>
	</div>
</PageHeaderSimple>

<div class="border-y border-warm-grey">
	<div class="relative text-base z-50">
		<Filters
			{searchTerm}
			{selectedView}
			selectedStatuses={statuses}
			selectedFuelTechs={fuelTechs}
			selectedRegions={regions}
			selectedSizes={sizes}
			onsearchchange={handleSearchChange}
			onstatuseschange={handleStatusesChange}
			onregionschange={handleRegionsChange}
			onfueltechschange={handleFuelTechsChange}
			onsizeschange={handleSizesChange}
			onviewchange={handleSelectedViewChange}
		/>
	</div>
</div>

<section class="relative h-[calc(100dvh-118px)]">
	<!-- Map: always visible on desktop, on mobile only when map view selected -->
	<div
		class="absolute inset-0"
		class:hidden={selectedView !== 'map'}
		class:md:block={selectedView !== 'map'}
	>
		<Map
			bind:this={mapRef}
			facilities={filteredWithLocation}
			{hoveredFacility}
			{selectedFacilityCode}
			clustering={mapClustering}
			onhover={(f) => (hoveredFacility = f)}
			onclick={(f) => (clickedFacility = f)}
			onselect={handleFacilitySelect}
		/>

		<!-- Map controls - positioned to the left of zoom controls -->
		<div class="absolute top-3 left-3 md:left-auto md:right-20 z-20 items-center gap-2 {selectedView === 'map' ? 'flex' : 'hidden md:flex'}">
			<button
				onclick={() => {
					mapRef?.resetView();
					if (selectedFacilityCode) {
						selectedFacilityCode = null;
						navigateWithoutRefetch({ statuses, regions, fuelTechs, sizes, view: selectedView, facility: null });
					}
				}}
				class="bg-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-light-warm-grey transition-colors border-2 border-mid-warm-grey"
				title="Reset map to show all facilities"
			>
				Reset Map
			</button>
			<button
				onclick={() => (mapClustering = !mapClustering)}
				class="bg-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-light-warm-grey transition-colors border-2 border-mid-warm-grey"
			>
				<span
					class="w-3 h-3 rounded-full transition-colors"
					class:bg-dark-grey={mapClustering}
					class:bg-mid-warm-grey={!mapClustering}
				></span>
				{mapClustering ? 'Clustering On' : 'Clustering Off'}
			</button>
		</div>
	</div>

	{#snippet summaryBar()}
		<div
			class="z-20 bg-white border-t border-warm-grey px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4"
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
			<div class="flex items-center gap-5 text-xs">
				<StatusCapacityBadge
					capacity={capacityByStatus.operating}
					colour={statusColours.operating}
					label="Operating"
				/>
				<StatusCapacityBadge
					capacity={capacityByStatus.commissioning}
					colour={statusColours.commissioning}
					label="Commissioning"
				/>
				<StatusCapacityBadge
					capacity={capacityByStatus.committed}
					colour={statusColours.committed}
					label="Committed"
				/>
				<StatusCapacityBadge
					capacity={capacityByStatus.retired}
					colour={statusColours.retired}
					label="Retired"
				/>
				<div class="flex items-center gap-1.5 pl-2 border-l border-warm-grey">
					<span class="font-mono font-medium text-dark-grey">{formatValue(totalCapacityMW)}</span>
					<span class="text-mid-grey">MW</span>
				</div>
			</div>
		</div>
	{/snippet}

	{#if selectedView === 'list'}
		<!-- List panel: full width on mobile, floating on desktop -->
		<div
			class="h-full md:absolute md:top-6 md:left-6 md:bottom-6 md:h-auto md:w-[calc(50%-3rem)] bg-white md:rounded-xl md:shadow-lg z-10 overflow-hidden flex flex-col min-h-0"
		>
			<div class="flex-1 overflow-y-auto min-h-0">
				<List
					facilities={filteredFacilities}
					{hoveredFacility}
					{clickedFacility}
					{selectedFacilityCode}
					onhover={(/** @type {any} */ f) => (hoveredFacility = f)}
					onclick={(/** @type {any} */ f) => {
						handleFacilitySelect(f);
					}}
				/>
			</div>
			{@render summaryBar()}
		</div>
	{:else if selectedView === 'timeline'}
		<!-- Timeline panel: full width on mobile, floating on desktop -->
		<div
			class="h-full md:absolute md:top-6 md:left-6 md:bottom-6 md:h-auto md:w-[calc(50%-3rem)] bg-white md:rounded-xl md:shadow-lg z-10 overflow-hidden flex flex-col min-h-0"
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
			<div class="flex-1 overflow-y-auto min-h-0" bind:this={timelineScrollContainer}>
				<div class="p-6">
					<Timeline
						bind:this={timelineRef}
						facilities={filteredWithLocation}
						{hoveredFacility}
						{clickedFacility}
						{selectedFacilityCode}
						ontodaybuttonvisible={handleTodayButtonVisible}
						scrollContainer={timelineScrollContainer}
						onhover={(/** @type {any} */ f) => (hoveredFacility = f)}
						onclick={(/** @type {any} */ f) => {
							handleFacilitySelect(f);
						}}
					/>
				</div>
			</div>
			{@render summaryBar()}
		</div>
	{/if}

	<!-- Map view summary bar: only visible on mobile -->
	{#if selectedView === 'map'}
		<div class="absolute bottom-0 left-0 right-0 md:hidden">
			{@render summaryBar()}
		</div>
	{/if}
</section>
