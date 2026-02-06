<script>
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { goto, replaceState } from '$app/navigation';
	import { getContext, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { X, Flag } from '@lucide/svelte';
	import MapOptionsDropdown from './_components/MapOptionsDropdown.svelte';
	import TransmissionLinesLegend from './_components/TransmissionLinesLegend.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import formatValue from './_utils/format-value';
	import { statusColours, isInSizeRange } from './_utils/filters.js';

	import Map from './Map.svelte';
	import Timeline from './Timeline.svelte';
	import Filters from './Filters.svelte';
	import List from './List.svelte';
	import StatusCapacityBadge from './StatusCapacityBadge.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import FacilityDetailPanel from './_components/FacilityDetailPanel.svelte';

	let { data } = $props();

	// Fullscreen mode - get context from layout
	/** @type {{ setFullscreen: (value: boolean) => void } | undefined} */
	const layoutContext = getContext('layout-fullscreen');

	// Parse fullscreen from URL
	let isFullscreen = $derived(page.url.searchParams.get('fullscreen') === 'true');

	// Sync fullscreen state with layout
	$effect(() => {
		layoutContext?.setFullscreen(isFullscreen);
	});

	// Reset fullscreen on unmount
	onDestroy(() => {
		layoutContext?.setFullscreen(false);
	});

	// Server data (updates when server responds)
	let facilities = $derived(data.facilities);

	// Optimistic local state for filters - updates immediately on user interaction
	// Initialize empty and sync via $effect to avoid capturing stale initial values
	/** @type {string[]} */
	let statuses = $state([]);
	/** @type {string[]} */
	let regions = $state([]);
	/** @type {string[]} */
	let fuelTechs = $state([]);
	/** @type {string[]} */
	let sizes = $state([]);
	/** @type {'list' | 'timeline' | 'map'} */
	let selectedView = $state(/** @type {'list' | 'timeline' | 'map'} */ ('list'));
	/** @type {string | null} */
	let selectedFacilityCode = $state(null);

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
	let hasInitiallyScrolledToToday = $state(false);

	let searchTerm = $state('');
	/** @type {any | null} */
	let hoveredFacility = $state(null);
	/** @type {any | null} */
	let clickedFacility = $state(null);

	// List sorting state (persists across view changes)
	/** @type {'name' | 'region' | 'capacity'} */
	let listSortBy = $state('name');
	/** @type {'asc' | 'desc'} */
	let listSortOrder = $state('asc');

	// Map options - read initial values from URL params
	// satellite: default false, transmission: default true, clustering: default false, golf: default false
	let mapSatelliteView = $state(page.url.searchParams.get('satellite') === 'true');
	let mapShowTransmissionLines = $state(page.url.searchParams.get('transmission') !== 'false');
	let mapClustering = $state(page.url.searchParams.get('clustering') === 'true');
	let mapShowGolfCourses = $state(page.url.searchParams.get('golf') === 'true');

	/** @type {{ high: boolean, medium: boolean, low: boolean, lowest: boolean }} */
	let transmissionLineVisibility = $state({ high: true, medium: true, low: true, lowest: true });

	// Golf courses easter egg - show option with 'G' key or ?golf=true
	let showGolfOption = $derived(page.url.searchParams.get('golf') === 'true');
	let golfUnlocked = $state(false);
	let showGolf = $derived(showGolfOption || golfUnlocked);

	/**
	 * Update map options in URL without refetch
	 */
	function updateMapOptionsUrl() {
		const params = new URLSearchParams(page.url.searchParams);

		// satellite: only include if true (default is false)
		if (mapSatelliteView) {
			params.set('satellite', 'true');
		} else {
			params.delete('satellite');
		}

		// transmission: only include if false (default is true)
		if (!mapShowTransmissionLines) {
			params.set('transmission', 'false');
		} else {
			params.delete('transmission');
		}

		// clustering: only include if true (default is false)
		if (mapClustering) {
			params.set('clustering', 'true');
		} else {
			params.delete('clustering');
		}

		// golf: only include if true (default is false)
		if (mapShowGolfCourses) {
			params.set('golf', 'true');
		} else {
			params.delete('golf');
		}

		const newUrl = `${page.url.pathname}?${params.toString()}`;
		replaceState(newUrl, {});
	}
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

	// Get power data from server (only if a facility is selected)
	let powerData = $derived(
		data.selectedFacility === selectedFacilityCode ? (data.powerData ?? null) : null
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
	 * Build URL from params
	 * @param {{statuses: string[], regions: string[], fuelTechs: string[], sizes: string[], view: string, facility?: string | null, fullscreen?: boolean}} params
	 * @returns {string}
	 */
	function buildUrl({
		statuses: s,
		regions: r,
		fuelTechs: ft,
		sizes: sz,
		view: v,
		facility: f = null,
		fullscreen: fs = false
	}) {
		let url = `/facilities?view=${v}&statuses=${s.join(',')}&regions=${r.join(',')}&fuel_techs=${ft.join(',')}&sizes=${sz.join(',')}`;
		if (f) {
			url += `&facility=${f}`;
		}
		if (fs) {
			url += '&fullscreen=true';
		}
		// Preserve map layer options
		if (mapSatelliteView) {
			url += '&satellite=true';
		}
		if (!mapShowTransmissionLines) {
			url += '&transmission=false';
		}
		if (mapClustering) {
			url += '&clustering=true';
		}
		if (mapShowGolfCourses) {
			url += '&golf=true';
		}
		return url;
	}

	/**
	 * Navigate and refetch data (for filter changes that affect API query)
	 * @param {{statuses: string[], regions: string[], fuelTechs: string[], sizes: string[], view: string, facility?: string | null, fullscreen?: boolean}} params
	 */
	function navigateWithRefetch(params) {
		goto(buildUrl({ ...params, fullscreen: params.fullscreen ?? isFullscreen }), {
			noScroll: true,
			invalidateAll: true
		});
	}

	/**
	 * Update URL without refetch (for view/facility/size changes that use cached data)
	 * Uses replaceState to avoid triggering the load function
	 * @param {{statuses: string[], regions: string[], fuelTechs: string[], sizes: string[], view: string, facility?: string | null, fullscreen?: boolean}} params
	 */
	function navigateWithoutRefetch(params) {
		replaceState(buildUrl({ ...params, fullscreen: params.fullscreen ?? isFullscreen }), {});
	}

	/**
	 * Toggle fullscreen mode
	 */
	function toggleFullscreen() {
		const newFullscreen = !isFullscreen;
		goto(
			buildUrl({
				statuses,
				regions,
				fuelTechs,
				sizes,
				view: selectedView,
				facility: selectedFacilityCode,
				fullscreen: newFullscreen
			}),
			{ noScroll: true }
		);
	}

	/**
	 * Handle keyboard shortcuts
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		// Escape exits fullscreen
		if (e.key === 'Escape' && isFullscreen) {
			e.preventDefault();
			toggleFullscreen();
		}

		// 'G' key toggles golf courses (easter egg)
		if (e.key === 'g' || e.key === 'G') {
			// Don't trigger if typing in an input
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			golfUnlocked = true;
			mapShowGolfCourses = !mapShowGolfCourses;
			updateMapOptionsUrl();
		}
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
		navigateWithoutRefetch({
			statuses,
			regions,
			fuelTechs,
			sizes,
			view: value,
			facility: selectedFacilityCode
		});
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
				closeFacilityDetail();
			} else {
				// Select new facility - refetch to get power data
				selectedFacilityCode = facility.code;
				navigateWithRefetch({
					statuses,
					regions,
					fuelTechs,
					sizes,
					view: selectedView,
					facility: facility.code
				});
			}
		}
	}

	/**
	 * Close facility detail panel
	 */
	function closeFacilityDetail() {
		selectedFacilityCode = null;
		mapRef?.closePopups();
		navigateWithoutRefetch({
			statuses,
			regions,
			fuelTechs,
			sizes,
			view: selectedView,
			facility: null
		});
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Meta
	title="Facilities"
	description="Power generation facilities in Australia."
	image="/img/facilities-preview.jpg"
/>

{#if !isFullscreen}
	<PageHeaderSimple>
		<!-- @migration-task: migrate this slot by hand, `main-heading` is an invalid identifier -->
		<div slot="main-heading">
			<h1 class="tracking-widest text-center">Facilities</h1>
		</div>
		<!-- @migration-task: migrate this slot by hand, `sub-heading` is an invalid identifier -->
		<div slot="sub-heading">
			<p class="text-sm text-center w-full md:w-[610px] mx-auto">
				Explore Australia's power generation facilities across the NEM and WEM. View upcoming
				projects on the timeline, browse the full list of facilities, or discover their locations on
				the map.
			</p>
		</div>
	</PageHeaderSimple>
{/if}

<div class={isFullscreen ? 'h-dvh flex flex-col' : ''}>
	<div class="border-y border-warm-grey flex-shrink-0">
		<div class="relative text-base z-50">
			<Filters
				{searchTerm}
				{selectedView}
				{isFullscreen}
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
				onfullscreenchange={toggleFullscreen}
			/>
		</div>
	</div>

	{#snippet summaryBar()}
		<div
			class="z-20 bg-white border-t border-mid-warm-grey px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4"
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
				{#if mapShowGolfCourses}
					<div class="flex items-center gap-1.5 pl-2 border-l border-warm-grey">
						<Flag class="size-5" style="color: #16a34a;" />
						<span class="text-green-600 font-medium">1,573</span>
						<span class="text-mid-grey">golf courses</span>
					</div>
				{/if}
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

	<section
		class="grid grid-cols-1 md:grid-cols-12 {isFullscreen
			? 'flex-1 min-h-0'
			: 'h-[calc(100dvh-500px)]'}"
	>
		<!-- Left panel: List or Timeline (5/12 width on desktop) -->
		<div
			class="col-span-1 md:col-span-5 bg-white flex flex-col min-h-0 z-10"
			class:hidden={selectedView === 'map'}
			class:md:flex={selectedView === 'map'}
		>
			{#if selectedView === 'list' || selectedView === 'map'}
				<div class="flex-1 overflow-y-auto min-h-0 pt-4">
					<List
						facilities={filteredFacilities}
						{hoveredFacility}
						{clickedFacility}
						{selectedFacilityCode}
						sortBy={listSortBy}
						sortOrder={listSortOrder}
						onhover={(/** @type {any} */ f) => (hoveredFacility = f)}
						onclick={(/** @type {any} */ f) => {
							handleFacilitySelect(f);
						}}
						onsortchange={(by, order) => {
							listSortBy = by;
							listSortOrder = order;
						}}
					/>
				</div>
			{:else if selectedView === 'timeline'}
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
							scrollToToday={!hasInitiallyScrolledToToday}
							onscrolledtotoday={() => (hasInitiallyScrolledToToday = true)}
							onhover={(/** @type {any} */ f) => (hoveredFacility = f)}
							onclick={(/** @type {any} */ f) => {
								handleFacilitySelect(f);
							}}
						/>
					</div>
				</div>
			{/if}
			{@render summaryBar()}
		</div>

		<!-- Right panel: Map (7/12 width on desktop) -->
		<div
			class="col-span-1 md:col-span-7 md:p-6"
			class:hidden={selectedView !== 'map'}
			class:md:block={selectedView !== 'map'}
		>
			<!-- Map container -->
			<div class="relative h-full md:rounded-lg md:border md:border-warm-grey overflow-hidden">
				<Map
					bind:this={mapRef}
					facilities={filteredWithLocation}
					{hoveredFacility}
					{selectedFacilityCode}
					clustering={mapClustering}
					satelliteView={mapSatelliteView}
					showTransmissionLines={mapShowTransmissionLines}
					{transmissionLineVisibility}
					showGolfCourses={mapShowGolfCourses}
					scrollZoom={isFullscreen}
					flyToOffsetX={0}
					flyToOffsetY={selectedFacilityCode ? (isFullscreen ? -0.25 : -0.15) : 0}
					onhover={(f) => (hoveredFacility = f)}
					onclick={(f) => (clickedFacility = f)}
					onselect={handleFacilitySelect}
				/>

				<!-- Map controls -->
				<div class="absolute top-3 right-20 z-20 flex items-center gap-2">
					<button
						onclick={() => {
							mapRef?.resetView();
							if (selectedFacilityCode) {
								selectedFacilityCode = null;
								navigateWithoutRefetch({
									statuses,
									regions,
									fuelTechs,
									sizes,
									view: selectedView,
									facility: null
								});
							}
						}}
						class="bg-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 hover:bg-light-warm-grey transition-colors border-2 border-warm-grey"
						title="Reset map to show all facilities"
					>
						Reset Map
					</button>
					<MapOptionsDropdown
						satelliteView={mapSatelliteView}
						showTransmissionLines={mapShowTransmissionLines}
						showGolfCourses={mapShowGolfCourses}
						showGolfOption={showGolf}
						showMagicIndicator={showGolf}
						clustering={mapClustering}
						onsatellitechange={(v) => {
							mapSatelliteView = v;
							updateMapOptionsUrl();
						}}
						ontransmissionlineschange={(v) => {
							mapShowTransmissionLines = v;
							updateMapOptionsUrl();
						}}
						ongolfcourseschange={(v) => {
							mapShowGolfCourses = v;
							updateMapOptionsUrl();
						}}
						onclusteringchange={(v) => {
							mapClustering = v;
							updateMapOptionsUrl();
						}}
					/>
				</div>

				{#if mapShowTransmissionLines}
					<TransmissionLinesLegend
						satelliteView={mapSatelliteView}
						visibility={transmissionLineVisibility}
						onvisibilitychange={(v) => (transmissionLineVisibility = v)}
					/>
				{/if}

				<!-- Facility detail panel -->
				{#if selectedFacilityCode}
					<div
						class="absolute bottom-0 inset-x-0 w-full bg-white md:rounded-lg md:border md:border-mid-warm-grey z-20 flex flex-col overflow-hidden md:h-[50%]"
						transition:fly={{ y: 200, duration: 250, easing: quintOut }}
					>
				<!-- Header -->
				<header
					class="flex items-center justify-between px-6 py-4 border-b border-warm-grey shrink-0"
				>
					<h2 class="text-lg font-medium text-dark-grey m-0 truncate pr-4">
						{facilities?.find((f) => f.code === selectedFacilityCode)?.name ?? ''}
					</h2>
					<button
						onclick={closeFacilityDetail}
						class="p-2 rounded-lg hover:bg-warm-grey transition-colors text-mid-grey hover:text-dark-grey cursor-pointer"
						aria-label="Close panel"
					>
						<X size={20} />
					</button>
				</header>

				<!-- Content -->
				<div class="flex-1 overflow-y-auto min-h-0">
					<FacilityDetailPanel facilityCode={selectedFacilityCode} {powerData} />
				</div>
				</div>
			{/if}
			</div>
		</div>
	</section>
</div>
