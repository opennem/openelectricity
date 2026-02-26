<script>
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { goto, replaceState } from '$app/navigation';
	import { getContext, onDestroy, untrack } from 'svelte';
	import { page } from '$app/state';
	import { X, Flag } from '@lucide/svelte';
	import MapOptionsDropdown from './_components/MapOptionsDropdown.svelte';
	import TransmissionLinesLegend from './_components/TransmissionLinesLegend.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';
	import formatValue from './_utils/format-value';
	import getUnitYear from './_utils/get-unit-year';
	import { statusColours } from './_utils/filters.js';

	import Map from './Map.svelte';
	import Timeline from './Timeline.svelte';
	import Filters from './Filters.svelte';
	import List from './List.svelte';
	import StatusCapacityBadge from './StatusCapacityBadge.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import FacilityDetailPanel from './_components/FacilityDetailPanel.svelte';
	import { ResizablePanel } from '$lib/components/ui/resizable-panel';
	import ShortcutsToast from './ShortcutsToast.svelte';

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
	/** @type {[number, number]} */
	let capacityRange = $state(/** @type {[number, number]} */ ([0, 10000]));
	/** @type {[number, number]} */
	let yearRange = $state(/** @type {[number, number]} */ ([1900, 2040]));
	/** @type {'list' | 'timeline' | 'map'} */
	let selectedView = $state(/** @type {'list' | 'timeline' | 'map'} */ (data.view));
	/** @type {any | null} */
	let selectedFacility = $state(null);

	// Sync local state when server data changes (e.g., browser back/forward, direct URL navigation)
	// Note: Only depends on `data` to avoid circular deps with capacityBounds (which depends on selectedView)
	$effect(() => {
		statuses = data.statuses;
		regions = data.regions;
		fuelTechs = data.fuelTechs;
		selectedView = /** @type {'list' | 'timeline' | 'map'} */ (data.view);
		selectedFacility = data.selectedFacility
			? facilities?.find((f) => f.code === data.selectedFacility) ?? null
			: null;
	});

	// Separate effect to initialize capacity range when data changes
	// Uses untrack to read capacityBounds without subscribing (prevents circular dep)
	$effect(() => {
		// Subscribe to data changes only
		const minFromUrl = data.capacityMin;
		const maxFromUrl = data.capacityMax;

		// Read capacityBounds without creating a dependency
		const bounds = untrack(() => capacityBounds);
		const minCapacity = minFromUrl ?? bounds.min;
		const maxCapacity = maxFromUrl ?? bounds.max;
		capacityRange = [minCapacity, maxCapacity];
	});

	// Separate effect to initialize year range when data changes
	$effect(() => {
		const minFromUrl = data.yearMin;
		const maxFromUrl = data.yearMax;

		const bounds = untrack(() => yearBounds);
		const minYear = minFromUrl ?? bounds.min;
		const maxYear = maxFromUrl ?? bounds.max;
		yearRange = [minYear, maxYear];
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

	// Map loading state
	let mapLoaded = $state(false);

	// Container height for responsive detail panel
	let containerHeight = $state(0);

	// Shortcuts toast
	let showShortcutsToast = $state(true);

	// Year animation playing state (from Filters)
	let isYearPlaying = $state(false);

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
	 * Get unit capacity
	 * @param {any} unit
	 * @returns {number}
	 */
	function getUnitCapacity(unit) {
		return Number(unit.capacity_maximum) || Number(unit.capacity_registered) || 0;
	}

	/**
	 * Calculate facility capacity
	 * @param {any} facility
	 * @returns {number}
	 */
	function getFacilityCapacity(facility) {
		return (facility.units ?? [])
			.filter(
				(/** @type {any} */ unit) =>
					unit.fueltech_id !== 'battery_charging' && unit.fueltech_id !== 'battery_discharging'
			)
			.reduce((/** @type {number} */ sum, /** @type {any} */ unit) => sum + getUnitCapacity(unit), 0);
	}

	/**
	 * Get all unit capacities from facilities (excluding battery charging/discharging)
	 * @param {any[]} facilityList
	 * @returns {number[]}
	 */
	function getAllUnitCapacities(facilityList) {
		return facilityList.flatMap((facility) =>
			(facility.units ?? [])
				.filter(
					(/** @type {any} */ unit) =>
						unit.fueltech_id !== 'battery_charging' && unit.fueltech_id !== 'battery_discharging'
				)
				.map((/** @type {any} */ unit) => getUnitCapacity(unit))
				.filter((/** @type {number} */ c) => c > 0)
		);
	}

	// Calculate capacity bounds based on view (unit capacity for Timeline, facility capacity for List/Map)
	let capacityBounds = $derived.by(() => {
		if (!facilities || facilities.length === 0) return { min: 0, max: 10000 };

		let capacities;
		if (selectedView === 'timeline') {
			// Timeline: use individual unit capacities
			capacities = getAllUnitCapacities(facilities);
		} else {
			// List/Map: use total facility capacities
			capacities = facilities.map(getFacilityCapacity).filter((c) => c > 0);
		}

		if (capacities.length === 0) return { min: 0, max: 10000 };

		const min = Math.floor(Math.min(...capacities));
		const max = Math.ceil(Math.max(...capacities));
		return { min, max };
	});

	// Calculate year bounds from all unit dates
	let yearBounds = $derived.by(() => {
		if (!facilities || facilities.length === 0) return { min: 1900, max: 2040 };

		/** @type {number[]} */
		const years = facilities.flatMap((facility) =>
			(facility.units ?? [])
				.filter(
					(/** @type {any} */ unit) =>
						unit.fueltech_id !== 'battery_charging' && unit.fueltech_id !== 'battery_discharging'
				)
				.map((/** @type {any} */ unit) => getUnitYear(unit))
				.filter((/** @type {number | null} */ y) => y !== null)
		);

		if (years.length === 0) return { min: 1900, max: 2040 };
		return { min: Math.min(...years), max: Math.max(...years) };
	});

	/**
	 * Check if a unit's year falls within the year range
	 * @param {any} unit
	 * @param {[number, number]} yearRangeFilter
	 * @param {boolean} isYearFiltered
	 * @returns {boolean}
	 */
	function unitMatchesYearRange(unit, yearRangeFilter, isYearFiltered) {
		if (!isYearFiltered) return true;
		const unitYear = getUnitYear(unit);
		if (unitYear === null) return false;
		return unitYear >= yearRangeFilter[0] && unitYear <= yearRangeFilter[1];
	}

	/**
	 * Filter facilities - in Timeline view, filter by unit capacity/year; in List/Map view, filter by facility capacity/year
	 * @param {any[]} facilityList
	 * @param {string} searchTerm
	 * @param {[number, number]} capacityRangeFilter
	 * @param {[number, number]} yearRangeFilter
	 * @param {{ min: number, max: number }} yearBoundsRef
	 * @param {'list' | 'timeline' | 'map'} view
	 * @returns {any[]}
	 */
	function filterFacilities(facilityList, searchTerm, capacityRangeFilter, yearRangeFilter, yearBoundsRef, view) {
		const isYearFiltered = yearRangeFilter[0] > yearBoundsRef.min || yearRangeFilter[1] < yearBoundsRef.max;

		if (view === 'timeline') {
			// Timeline: filter units by individual capacity and year, keep facilities with matching units
			return facilityList
				.map((facility) => ({
					...facility,
					units: facility.units?.filter(
						(/** @type {any} */ unit) =>
							unit.fueltech_id !== 'battery_charging' &&
							unit.fueltech_id !== 'battery_discharging' &&
							(searchTerm ? facility.name.toLowerCase().includes(searchTerm.toLowerCase()) : true) &&
							getUnitCapacity(unit) >= capacityRangeFilter[0] &&
							getUnitCapacity(unit) <= capacityRangeFilter[1] &&
							unitMatchesYearRange(unit, yearRangeFilter, isYearFiltered)
					)
				}))
				.filter((facility) => facility.units && facility.units.length > 0);
		} else {
			// List/Map: filter by total facility capacity and year
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
					const totalCapacity = facility.units.reduce(
						(/** @type {number} */ sum, /** @type {any} */ unit) => sum + getUnitCapacity(unit),
						0
					);
					return totalCapacity >= capacityRangeFilter[0] && totalCapacity <= capacityRangeFilter[1];
				})
				.filter((facility) => {
					if (!isYearFiltered) return true;
					return facility.units.some(
						(/** @type {any} */ unit) => unitMatchesYearRange(unit, yearRangeFilter, isYearFiltered)
					);
				});
		}
	}

	let filteredFacilities = $derived(
		facilities ? filterFacilities(facilities, searchTerm, capacityRange, yearRange, yearBounds, selectedView) : []
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
		data.selectedFacility === selectedFacility?.code ? (data.powerData ?? null) : null
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
	 * @typedef {{statuses: string[], regions: string[], fuelTechs: string[], capacityRange: [number, number], yearRange: [number, number], view: string, facility?: string | null, fullscreen?: boolean}} NavParams
	 */

	/**
	 * Build URL from params
	 * @param {NavParams} params
	 * @returns {string}
	 */
	function buildUrl({
		statuses: s,
		regions: r,
		fuelTechs: ft,
		capacityRange: cr,
		yearRange: yr,
		view: v,
		facility: f = null,
		fullscreen: fs = false
	}) {
		let url = `/facilities?view=${v}&statuses=${s.join(',')}&regions=${r.join(',')}&fuel_techs=${ft.join(',')}`;
		// Only include capacity range if it's been filtered from defaults
		if (cr[0] > 0 || cr[1] < capacityBounds.max) {
			url += `&capacity_min=${cr[0]}&capacity_max=${cr[1]}`;
		}
		// Only include year range if it's been filtered from defaults
		if (yr[0] > yearBounds.min || yr[1] < yearBounds.max) {
			url += `&year_min=${yr[0]}&year_max=${yr[1]}`;
		}
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
	 * @param {NavParams} params
	 */
	function navigateWithRefetch(params) {
		goto(buildUrl({ ...params, fullscreen: params.fullscreen ?? isFullscreen }), {
			noScroll: true,
			invalidateAll: true
		});
	}

	/**
	 * Update URL without refetch (for view/facility/capacity changes that use cached data)
	 * Uses replaceState to avoid triggering the load function
	 * @param {NavParams} params
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
				capacityRange,
				yearRange,
				view: selectedView,
				facility: selectedFacility?.code ?? null,
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

		// '?' key toggles shortcuts toast
		if (e.key === '?') {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
			showShortcutsToast = !showShortcutsToast;
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
		navigateWithRefetch({ statuses, regions: values, fuelTechs, capacityRange, yearRange, view: selectedView });
	}

	/**
	 * @param {string[]} values
	 */
	function handleFuelTechsChange(values) {
		// Optimistic update
		fuelTechs = values;
		// Filter change requires refetch
		navigateWithRefetch({ statuses, regions, fuelTechs: values, capacityRange, yearRange, view: selectedView });
	}

	/**
	 * @param {string[]} values
	 */
	function handleStatusesChange(values) {
		// Optimistic update
		statuses = values;
		// Filter change requires refetch
		navigateWithRefetch({ statuses: values, regions, fuelTechs, capacityRange, yearRange, view: selectedView });
	}

	/**
	 * @param {[number, number]} range
	 */
	function handleCapacityRangeChange(range) {
		// Optimistic update
		capacityRange = range;
		// Capacity is client-side filtered, no refetch needed
		navigateWithoutRefetch({ statuses, regions, fuelTechs, capacityRange: range, yearRange, view: selectedView });
	}

	/**
	 * @param {[number, number]} range
	 */
	function handleYearRangeChange(range) {
		// Optimistic update
		yearRange = range;
		// Year is client-side filtered, no refetch needed
		navigateWithoutRefetch({ statuses, regions, fuelTechs, capacityRange, yearRange: range, view: selectedView });
	}

	/**
	 * @param {'list' | 'timeline' | 'map'} value
	 */
	function handleSelectedViewChange(value) {
		// Optimistic update
		selectedView = value;

		// Reset capacity range to match new view's bounds
		// (timeline uses unit capacities, list/map uses facility capacities)
		capacityRange = [capacityBounds.min, capacityBounds.max];
		yearRange = [yearBounds.min, yearBounds.max];

		// View change uses cached data, no refetch needed
		navigateWithoutRefetch({
			statuses,
			regions,
			fuelTechs,
			capacityRange,
			yearRange,
			view: value,
			facility: selectedFacility?.code ?? null
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
			if (selectedFacility?.code === facility.code) {
				// Toggle off - clear selection and close popups
				closeFacilityDetail();
			} else {
				// Select new facility - store object and refetch to get power data
				selectedFacility = facility;
				navigateWithRefetch({
					statuses,
					regions,
					fuelTechs,
					capacityRange,
					yearRange,
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
		selectedFacility = null;
		mapRef?.closePopups();
		navigateWithoutRefetch({
			statuses,
			regions,
			fuelTechs,
			capacityRange,
			yearRange,
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
	<PageHeaderSimple class="!h-[80px] md:!h-[300px]">
		{#snippet heading()}
			<div>
				<h1 class="md:tracking-widest text-center text-xl md:text-6xl mb-0 md:mb-[0.5em]">Facilities</h1>
			</div>
		{/snippet}
		{#snippet subheading()}
			<div class="hidden md:block mt-4">
				<p class="text-sm text-center w-[610px] mx-auto">
					Explore Australia's power generation facilities across the NEM and WEM. View upcoming
					projects on the timeline, browse the full list of facilities, or discover their locations on
					the map.
				</p>
			</div>
		{/snippet}
	</PageHeaderSimple>
{/if}

<div class={isFullscreen ? 'h-dvh flex flex-col' : ''}>
	<div class="border-y border-warm-grey flex-shrink-0">
		<div class="relative text-base z-50">
			<Filters
				{searchTerm}
				{selectedView}
				{isFullscreen}
				showShortcuts={showShortcutsToast}
				selectedStatuses={statuses}
				selectedFuelTechs={fuelTechs}
				selectedRegions={regions}
				{capacityRange}
				capacityMin={capacityBounds.min}
				capacityMax={capacityBounds.max}
				{yearRange}
				yearMin={yearBounds.min}
				yearMax={yearBounds.max}
				onsearchchange={handleSearchChange}
				onstatuseschange={handleStatusesChange}
				onregionschange={handleRegionsChange}
				onfueltechschange={handleFuelTechsChange}
				oncapacityrangechange={handleCapacityRangeChange}
				onyearrangechange={handleYearRangeChange}
				onviewchange={handleSelectedViewChange}
				onfullscreenchange={toggleFullscreen}
			onyearplayingchange={(playing) => (isYearPlaying = playing)}
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
		bind:clientHeight={containerHeight}
		class="relative grid grid-cols-1 md:grid-cols-12 {isFullscreen
			? 'flex-1 min-h-0'
			: 'h-[calc(100dvh-214px)] md:h-[calc(100dvh-500px)] md:min-h-[800px]'}"
	>
		<!-- Left panel: List or Timeline (5/12 width on desktop) -->
		<div
			class="relative col-span-1 md:col-span-5 bg-white flex flex-col min-h-0 z-10"
			class:hidden={selectedView === 'map'}
			class:md:flex={selectedView === 'map'}
		>
			{#if selectedView === 'list' || selectedView === 'map'}
				<div class="flex-1 overflow-y-auto min-h-0 mt-4">
					<List
						facilities={filteredFacilities}
						{hoveredFacility}
						{clickedFacility}
						selectedFacilityCode={selectedFacility?.code ?? null}
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
						class:bottom-28={todayButtonPosition === 'bottom'}
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
							selectedFacilityCode={selectedFacility?.code ?? null}
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
				{#if !mapLoaded}
					<div class="absolute inset-0 z-10 bg-[#D5D8DC]/50 flex items-center justify-center md:rounded-lg">
						<LogoMarkLoader />
					</div>
				{/if}
				<Map
					bind:this={mapRef}
					facilities={filteredWithLocation}
					{hoveredFacility}
					selectedFacilityCode={selectedFacility?.code ?? null}
					clustering={mapClustering}
					satelliteView={mapSatelliteView}
					showTransmissionLines={mapShowTransmissionLines}
					{transmissionLineVisibility}
					showGolfCourses={mapShowGolfCourses}
					scrollZoom={!isYearPlaying}
					suppressFitBounds={isYearPlaying}
					cooperativeGestures={!isFullscreen}
					flyToOffsetX={0}
					flyToOffsetY={selectedFacility ? (isFullscreen ? -0.25 : -0.15) : 0}
					onhover={(f) => (hoveredFacility = f)}
					onclick={(f) => (clickedFacility = f)}
					onselect={handleFacilitySelect}
					onload={() => setTimeout(() => (mapLoaded = true), 250)}
				/>

				<!-- Map controls -->
				<div class="absolute top-3 right-20 z-20 flex items-center gap-2">
					<button
						onclick={() => {
							mapRef?.resetView();
							if (selectedFacility) {
								closeFacilityDetail();
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

				<!-- Facility detail panel (desktop only) -->
				<ResizablePanel
					open={!!selectedFacility}
					onclose={closeFacilityDetail}
					title={selectedFacility?.name ?? ''}
					direction="top"
					defaultSize={containerHeight < 650 ? 100 : isFullscreen ? 66 : 50}
					minSize={250}
					containerSize={containerHeight}
					class="hidden md:flex absolute bottom-0 inset-x-0 w-full bg-white md:rounded-lg md:border md:border-mid-warm-grey z-20"
				>
					<FacilityDetailPanel facility={selectedFacility} {powerData} />
				</ResizablePanel>
			</div>
		</div>

		<!-- Facility detail panel (mobile only - covers full section height) -->
		{#if selectedFacility}
			<div
				class="md:hidden absolute inset-0 w-full bg-white z-30 flex flex-col overflow-hidden"
				transition:fly={{ y: 200, duration: 250, easing: quintOut }}
			>
				<!-- Header -->
				<header
					class="flex items-center justify-between px-6 py-4 border-b border-warm-grey shrink-0"
				>
					<h2 class="text-lg font-medium text-dark-grey m-0 truncate pr-4">
						{selectedFacility?.name ?? ''}
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
					<FacilityDetailPanel facility={selectedFacility} {powerData} />
				</div>
			</div>
		{/if}
	</section>
</div>

<ShortcutsToast visible={showShortcutsToast} ondismiss={() => (showShortcutsToast = false)} />
