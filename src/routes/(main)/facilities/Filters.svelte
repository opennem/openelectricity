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
		ALL_STATUSES,
		DEFAULT_STATUSES,
		VIEW_OPTIONS
	} from '$lib/facilities/filters.js';

	/**
	 * @type {{
	 *   selectedRegions?: string[],
	 *   selectedStatuses?: string[],
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

	// "N active" across status/technology/region — badges the mobile Filters
	// button and is passed into the modal so both always agree.
	let activeFilterCount = $derived(
		countSelectedLeaves(statusOptions, selectedStatuses) +
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
	 * @param {string | string[]} value
	 * @param {boolean} isMetaPressed
	 */
	function handleRegionChange(value, isMetaPressed) {
		let newSelection = [];

		if (Array.isArray(value)) {
			const allSelected = value.every((v) => selectedRegions.includes(v));
			if (isMetaPressed) {
				newSelection = [...value];
			} else if (allSelected) {
				newSelection = selectedRegions.filter((item) => !value.includes(item));
			} else {
				newSelection = [...new Set([...selectedRegions, ...value])];
			}
		} else {
			newSelection = toggleSelection(selectedRegions, value, isMetaPressed);
		}

		onregionschange?.(newSelection);
	}

	/**
	 * Statuses are a flat list, so `value` is always a single string
	 * (arrays are only emitted for hierarchical parent options).
	 * @param {string | string[]} value
	 * @param {boolean} isMetaPressed
	 */
	function handleStatusChange(value, isMetaPressed) {
		if (Array.isArray(value)) return;
		onstatuseschange?.(toggleSelection(selectedStatuses, value, isMetaPressed));
	}

	/**
	 * @param {string | string[]} value
	 * @param {boolean} isMetaPressed
	 */
	function handleFuelTechChange(value, isMetaPressed) {
		let newSelection = [];

		if (Array.isArray(value)) {
			const allSelected = value.every((v) => selectedFuelTechs.includes(v));
			if (isMetaPressed) {
				newSelection = [...value];
			} else if (allSelected) {
				newSelection = selectedFuelTechs.filter((item) => !value.includes(item));
			} else {
				newSelection = [...new Set([...selectedFuelTechs, ...value])];
			}
		} else {
			newSelection = toggleSelection(selectedFuelTechs, value, isMetaPressed);
		}

		onfueltechschange?.(newSelection);
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
	{regionOptions}
	{statusOptions}
	{fuelTechOptions}
	{selectedRegions}
	{selectedStatuses}
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
	onclearstatuses={() => onstatuseschange?.([...DEFAULT_STATUSES])}
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
					options={statusOptions}
					selected={selectedStatuses}
					compact={isFullscreen}
					clearLabel="Reset to defaults"
					onchange={handleStatusChange}
					onclear={() => onstatuseschange?.([...DEFAULT_STATUSES])}
					onselectall={() => onstatuseschange?.([...ALL_STATUSES])}
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
