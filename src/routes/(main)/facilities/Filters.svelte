<script>
	import { FullscreenFilterBar, FullscreenNavDropdown } from '$lib/components/fullscreen';
	import MobileFilterModal from './_components/MobileFilterModal.svelte';
	import SearchInput from './_components/SearchInput.svelte';
	import FilterDropdown from './_components/filters/FilterDropdown.svelte';
	import FilterRangeDropdown from './_components/filters/FilterRangeDropdown.svelte';
	import FuelTechRowContent from './_components/filters/FuelTechRowContent.svelte';
	import { ListFilter } from '@lucide/svelte';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import SwitchWithIcons from '$lib/components/SwitchWithIcons.svelte';

	import { getLeafValues, countSelectedLeaves } from './_utils/filter-options.js';
	import {
		regionOptions,
		fuelTechOptions,
		statusOptions,
		loadStatusOptions,
		typeOptions,
		ALL_STATUSES,
		DEFAULT_STATUSES,
		ALL_LOAD_STATUSES,
		DEFAULT_LOAD_STATUSES,
		ALL_TYPES,
		DEFAULT_TYPES,
		VIEW_OPTIONS
	} from '$lib/facilities/filters.js';

	/**
	 * @type {{
	 *   selectedRegions?: string[],
	 *   selectedStatuses?: string[],
	 *   selectedLoadStatuses?: string[],
	 *   selectedTypes?: string[],
	 *   selectedFuelTechs?: string[],
	 *   capacityRange?: [number, number],
	 *   capacityMin?: number,
	 *   capacityMax?: number,
	 *   searchTerm?: string,
	 *   selectedView?: 'list' | 'timeline' | 'grid',
	 *   isFullscreen?: boolean,
	 *   facilitySelected?: boolean,
	 *   darkMap?: boolean,
	 *   showShortcuts?: boolean,
	 *   onstatuseschange?: (values: string[]) => void,
	 *   onloadstatuseschange?: (values: string[]) => void,
	 *   ontypeschange?: (values: string[]) => void,
	 *   onregionschange?: (values: string[]) => void,
	 *   onfueltechschange?: (values: string[]) => void,
	 *   oncapacityrangechange?: (range: [number, number]) => void,
	 *   yearRange?: [number, number],
	 *   yearMin?: number,
	 *   yearMax?: number,
	 *   onyearrangechange?: (range: [number, number]) => void,
	 *   onsearchchange?: (value: string) => void,
	 *   onviewchange?: (view: 'list' | 'timeline' | 'grid') => void,
	 *   onfullscreenchange?: () => void,
	 *   onshowshortcuts?: () => void,
	 *   ondownloadcsv?: () => void,
	 *   onshortcutinvoked?: () => void,
	 *   filteredCount?: number,
	 *   onresetall?: () => void
	 * }}
	 */
	let {
		selectedRegions = [],
		selectedStatuses = [],
		selectedLoadStatuses = [],
		selectedTypes = [],
		selectedFuelTechs = [],
		capacityRange = [0, 10000],
		capacityMin = 0,
		capacityMax = 10000,
		searchTerm = '',
		selectedView = 'list',
		isFullscreen = true,
		facilitySelected = false,
		// Dark/satellite basemap behind the floating nav → white logo mark.
		darkMap = false,
		showShortcuts = false,
		onstatuseschange,
		onloadstatuseschange,
		ontypeschange,
		onregionschange,
		onfueltechschange,
		oncapacityrangechange,
		yearRange = [1900, 2040],
		yearMin = 1900,
		yearMax = 2040,
		onyearrangechange,
		onsearchchange,
		onviewchange,
		onfullscreenchange,
		onshowshortcuts,
		ondownloadcsv,
		onshortcutinvoked,
		filteredCount = 0,
		onresetall
	} = $props();

	// ============================================
	// Local State
	// ============================================

	let showMobileFilterOptions = $state(false);

	/** @type {SearchInput | null} */
	let mobileSearchRef = $state(null);
	/** @type {SearchInput | null} */
	let desktopSearchRef = $state(null);

	// The Status dropdown carries two sections — Generators (OE facility
	// statuses, server round-trip) and Loads (data centre buckets, client-side).
	// Load values are prefixed inside the dropdown tree so they can't collide
	// with the generator values ('operating'/'retired' exist in both).
	const LOAD_PREFIX = 'load_';
	const combinedStatusOptions = [
		{ label: 'Generators', value: 'generators', children: statusOptions },
		{
			label: 'Loads',
			value: 'loads',
			children: loadStatusOptions.map((opt) => ({ ...opt, value: `${LOAD_PREFIX}${opt.value}` }))
		}
	];
	let combinedSelectedStatuses = $derived([
		...selectedStatuses,
		...selectedLoadStatuses.map((s) => `${LOAD_PREFIX}${s}`)
	]);

	// "N active" across type/status/technology/region — badges the mobile
	// Filters button and is passed into the modal so both always agree.
	let activeFilterCount = $derived(
		countSelectedLeaves(typeOptions, selectedTypes) +
			countSelectedLeaves(combinedStatusOptions, combinedSelectedStatuses) +
			countSelectedLeaves(fuelTechOptions, selectedFuelTechs) +
			countSelectedLeaves(regionOptions, selectedRegions)
	);

	// ============================================
	// Browser Fullscreen API
	// ============================================

	/**
	 * Toggle browser fullscreen mode
	 * Also enables app fullscreen (hides nav/footer) when entering
	 */
	function toggleBrowserFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			// Enter browser fullscreen and also enable app fullscreen mode
			document.documentElement.requestFullscreen();
			if (!isFullscreen) {
				onfullscreenchange?.();
			}
		}
	}

	/**
	 * Handle fullscreen change events
	 * Exit app fullscreen when exiting browser fullscreen
	 */
	function handleFullscreenChange() {
		if (!document.fullscreenElement && isFullscreen) {
			onfullscreenchange?.();
		}
	}

	// ============================================
	// Formatters
	// ============================================

	/**
	 * Format capacity value for display
	 * @param {number} val
	 * @returns {string}
	 */
	function formatCapacity(val) {
		if (val >= 1000) {
			const gw = val / 1000;
			// Remove unnecessary decimal (3.0 -> 3, but keep 3.5)
			const formatted = gw % 1 === 0 ? gw.toFixed(0) : gw.toFixed(1);
			return `${formatted} GW`;
		}
		return `${Math.round(val)} MW`;
	}

	/**
	 * Format year value for display
	 * @param {number} val
	 * @returns {string}
	 */
	function formatYear(val) {
		return String(val);
	}

	// ============================================
	// Event Handlers
	// ============================================

	/**
	 * Handle keyboard shortcuts: '/' to focus search, 'f' to toggle fullscreen, Shift+F for browser fullscreen
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		const target = /** @type {HTMLElement} */ (e.target);
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return;
		}

		if (e.key === '/') {
			e.preventDefault();
			if (window.innerWidth < 768) {
				mobileSearchRef?.focus();
			} else {
				desktopSearchRef?.focus();
			}
			onshortcutinvoked?.();
			return;
		}

		// F for app fullscreen (maximised mode), Shift+F for browser fullscreen
		if (e.key === 'f' || e.key === 'F') {
			e.preventDefault();
			if (e.shiftKey) {
				toggleBrowserFullscreen();
			} else {
				onfullscreenchange?.();
			}
			onshortcutinvoked?.();
		}
	}

	/**
	 * Toggle selection in an array
	 * @param {string[]} currentSelection
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 * @returns {string[]}
	 */
	function toggleSelection(currentSelection, value, isMetaPressed) {
		if (isMetaPressed) return [value];
		if (currentSelection.includes(value)) {
			return currentSelection.filter((item) => item !== value);
		}
		return [...currentSelection, value];
	}

	/**
	 * Toggle a parent group's child values in a selection: meta-press selects
	 * only the group; otherwise a fully-selected group is removed, a partial
	 * one is unioned in. Shared by the region, status and fuel-tech handlers.
	 * @param {string[]} currentSelection
	 * @param {string[]} values
	 * @param {boolean} isMetaPressed
	 * @returns {string[]}
	 */
	function toggleGroupSelection(currentSelection, values, isMetaPressed) {
		if (isMetaPressed) return [...values];
		const allSelected = values.every((v) => currentSelection.includes(v));
		return allSelected
			? currentSelection.filter((item) => !values.includes(item))
			: [...new Set([...currentSelection, ...values])];
	}

	/**
	 * @param {string | string[]} value
	 * @param {boolean} isMetaPressed
	 */
	function handleRegionChange(value, isMetaPressed) {
		onregionschange?.(
			Array.isArray(value)
				? toggleGroupSelection(selectedRegions, value, isMetaPressed)
				: toggleSelection(selectedRegions, value, isMetaPressed)
		);
	}

	/**
	 * Type is a flat two-option list, so `value` is always a single string
	 * (arrays are only emitted for hierarchical parent options).
	 * @param {string | string[]} value
	 * @param {boolean} isMetaPressed
	 */
	function handleTypeChange(value, isMetaPressed) {
		if (Array.isArray(value)) return;
		ontypeschange?.(toggleSelection(selectedTypes, value, isMetaPressed));
	}

	/**
	 * @param {string | string[]} value
	 * @param {boolean} isMetaPressed
	 */
	function handleStatusChange(value, isMetaPressed) {
		if (Array.isArray(value)) {
			// Section-header toggle — the array is one section's children, so it
			// belongs entirely to either the generator or the load selection.
			if (value.every((v) => v.startsWith(LOAD_PREFIX))) {
				const values = value.map((v) => v.slice(LOAD_PREFIX.length));
				onloadstatuseschange?.(toggleGroupSelection(selectedLoadStatuses, values, isMetaPressed));
			} else {
				onstatuseschange?.(toggleGroupSelection(selectedStatuses, value, isMetaPressed));
			}
			return;
		}
		if (value.startsWith(LOAD_PREFIX)) {
			onloadstatuseschange?.(
				toggleSelection(selectedLoadStatuses, value.slice(LOAD_PREFIX.length), isMetaPressed)
			);
		} else {
			onstatuseschange?.(toggleSelection(selectedStatuses, value, isMetaPressed));
		}
	}

	/**
	 * @param {string | string[]} value
	 * @param {boolean} isMetaPressed
	 */
	function handleFuelTechChange(value, isMetaPressed) {
		onfueltechschange?.(
			Array.isArray(value)
				? toggleGroupSelection(selectedFuelTechs, value, isMetaPressed)
				: toggleSelection(selectedFuelTechs, value, isMetaPressed)
		);
	}

	/**
	 * @param {{ value: string }} option
	 */
	function handleViewChange(option) {
		onviewchange?.(/** @type {'list' | 'timeline' | 'grid'} */ (option.value));
	}
</script>

<svelte:window onkeydown={handleKeydown} />
<svelte:document onfullscreenchange={handleFullscreenChange} />

{#snippet fuelTechRow(/** @type {import('./_utils/filter-options.js').FilterOption} */ option)}
	<FuelTechRowContent {option} />
{/snippet}

<!-- Mobile Filter Modal -->
<MobileFilterModal
	open={showMobileFilterOptions}
	{typeOptions}
	{regionOptions}
	statusOptions={combinedStatusOptions}
	{fuelTechOptions}
	{selectedTypes}
	{selectedRegions}
	selectedStatuses={combinedSelectedStatuses}
	{selectedFuelTechs}
	{capacityRange}
	{capacityMin}
	{capacityMax}
	{formatCapacity}
	onclose={() => (showMobileFilterOptions = false)}
	onregionschange={handleRegionChange}
	onstatuseschange={handleStatusChange}
	onfueltechschange={handleFuelTechChange}
	oncapacityrangechange={(range) => oncapacityrangechange?.(range)}
	{yearRange}
	{yearMin}
	{yearMax}
	onyearrangechange={(range) => onyearrangechange?.(range)}
	onclearyears={() => onyearrangechange?.([yearMin, yearMax])}
	onclearregions={() => onregionschange?.([])}
	ontypeschange={handleTypeChange}
	oncleartypes={() => ontypeschange?.([...DEFAULT_TYPES])}
	onclearstatuses={() => {
		onstatuseschange?.([...DEFAULT_STATUSES]);
		onloadstatuseschange?.([...DEFAULT_LOAD_STATUSES]);
	}}
	onclearfueltechs={() => onfueltechschange?.([])}
	onclearcapacity={() => oncapacityrangechange?.([capacityMin, capacityMax])}
	{filteredCount}
	onresetall={() => onresetall?.()}
/>

<!-- Mobile floating nav — the filter bar below is desktop-only; on mobile the
     map is full-bleed and the chrome floats over it. Hidden while a facility
     is selected (the page's floating back button takes its place) or while
     the filter sheet is open (the map peeks bare above it). -->
{#if !facilitySelected && !showMobileFilterOptions}
	<div class="tablet:hidden fixed top-3 inset-x-3 z-40 flex items-stretch gap-2">
		<div class="shrink-0 flex items-center">
			<FullscreenNavDropdown light={darkMap} />
		</div>
		<SearchInput
			bind:this={mobileSearchRef}
			value={searchTerm}
			onchange={(value) => onsearchchange?.(value)}
			rounded="rounded-lg"
			class="flex-1 min-w-0 rounded-lg shadow-lg"
		/>
		<!-- Fixed width so the button doesn't resize when the count badge
		     appears/disappears. -->
		<button
			onclick={() => (showMobileFilterOptions = true)}
			class="shrink-0 w-40 flex items-center justify-center gap-2 rounded-lg bg-white border border-warm-grey shadow-lg text-sm font-medium text-dark-grey cursor-pointer"
		>
			<ListFilter class="size-4" />
			<span>Filters</span>
			{#if activeFilterCount > 0}
				<span
					class="min-w-6 h-6 px-1.5 rounded-full bg-dark-grey text-white text-xs font-medium flex items-center justify-center"
				>
					{activeFilterCount}
				</span>
			{/if}
		</button>
	</div>
{/if}

<div class="hidden tablet:block">
	<FullscreenFilterBar {isFullscreen} routeKey="list" paddingX="px-8">
		{#snippet stable()}
			{#if isFullscreen}
				<FullscreenNavDropdown />
				<a
					href="/facilities?view=list"
					class="rounded-lg hover:bg-warm-grey font-semibold text-dark-grey no-underline hover:no-underline text-sm lg:text-base px-2 py-1"
				>
					Facilities
				</a>
			{/if}
		{/snippet}

		{#snippet rest()}
			{#if isFullscreen}
				<div class="h-8 border-l border-warm-grey shrink-0"></div>
			{/if}

			<!-- View Switcher -->
			<div class={isFullscreen ? 'pl-3' : ''}>
				<SwitchWithIcons
					buttons={VIEW_OPTIONS}
					selected={selectedView}
					compact={isFullscreen}
					rounded="rounded-lg"
					darkSelected
					onchange={handleViewChange}
				/>
			</div>

			<!-- Search -->
			<div
				class="relative flex items-center border-l border-warm-grey {isFullscreen
					? 'ml-3 pl-7'
					: 'ml-6 pl-10'}"
			>
				<SearchInput
					bind:this={desktopSearchRef}
					value={searchTerm}
					onchange={(value) => onsearchchange?.(value)}
					showShortcutHint={showShortcuts}
					compact={isFullscreen}
					class="w-[200px]"
				/>
			</div>

			<!-- Filter Dropdowns (pushed right via ml-auto). The left padding
		     mirrors the gap on the other side of the cluster (bar gap-4 + options
		     menu ml-4, or ml-2 in fullscreen) so the dividers sit evenly. -->
			<div
				class="filter-bar-scroll justify-start items-center gap-2 flex border-l border-warm-grey overflow-x-auto min-w-0 ml-auto {isFullscreen
					? 'pl-6'
					: 'pl-8'}"
			>
				<FilterDropdown
					label="Type"
					options={typeOptions}
					selected={selectedTypes}
					compact={isFullscreen}
					clearLabel="Reset to defaults"
					onchange={handleTypeChange}
					onclear={() => ontypeschange?.([...DEFAULT_TYPES])}
					onselectall={() => ontypeschange?.([...ALL_TYPES])}
				/>

				<FilterDropdown
					label="Region"
					options={regionOptions}
					selected={selectedRegions}
					defaultExpanded={['nem']}
					compact={isFullscreen}
					onchange={handleRegionChange}
					onclear={() => onregionschange?.([])}
					onselectall={() => onregionschange?.(getLeafValues(regionOptions))}
				/>

				<FilterDropdown
					label="Status"
					options={combinedStatusOptions}
					selected={combinedSelectedStatuses}
					defaultExpanded={['generators', 'loads']}
					compact={isFullscreen}
					clearLabel="Reset to defaults"
					onchange={handleStatusChange}
					onclear={() => {
						onstatuseschange?.([...DEFAULT_STATUSES]);
						onloadstatuseschange?.([...DEFAULT_LOAD_STATUSES]);
					}}
					onselectall={() => {
						onstatuseschange?.([...ALL_STATUSES]);
						onloadstatuseschange?.([...ALL_LOAD_STATUSES]);
					}}
				/>

				<FilterDropdown
					label="Technology"
					options={fuelTechOptions}
					selected={selectedFuelTechs}
					searchable
					searchPlaceholder="Search technologies"
					compact={isFullscreen}
					onchange={handleFuelTechChange}
					onclear={() => onfueltechschange?.([])}
					onselectall={() => onfueltechschange?.(getLeafValues(fuelTechOptions))}
					row={fuelTechRow}
				/>

				<FilterRangeDropdown
					label="Capacity"
					min={capacityMin}
					max={capacityMax}
					value={capacityRange}
					step={10}
					formatValue={formatCapacity}
					compact={isFullscreen}
					onchange={(range) => oncapacityrangechange?.(range)}
					onclear={() => oncapacityrangechange?.([capacityMin, capacityMax])}
				/>

				<FilterRangeDropdown
					label="Years"
					min={yearMin}
					max={yearMax}
					value={yearRange}
					step={1}
					formatValue={formatYear}
					compact={isFullscreen}
					onchange={(range) => onyearrangechange?.(range)}
					onclear={() => onyearrangechange?.([yearMin, yearMax])}
				/>
			</div>
		{/snippet}

		{#snippet options()}
			<div class="flex items-center">
				<PageOptionsMenu
					{isFullscreen}
					onfullscreenchange={() => onfullscreenchange?.()}
					onshowshortcuts={() => onshowshortcuts?.()}
					ondownloadcsv={() => ondownloadcsv?.()}
					showCopyLink
				/>
			</div>
		{/snippet}
	</FullscreenFilterBar>
</div>

<style>
	.filter-bar-scroll {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.filter-bar-scroll::-webkit-scrollbar {
		display: none;
	}
</style>
