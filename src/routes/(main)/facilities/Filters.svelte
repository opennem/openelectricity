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

	import { activeLeafCount } from '$lib/facilities/filter-options.js';
	import {
		regionOptions,
		statusOptions,
		loadStatusOptions,
		typeOptions,
		fuelTechOptions,
		FUEL_TECH_OPTION_VALUES,
		DEFAULT_STATUSES,
		DEFAULT_LOAD_STATUSES,
		ALL_REGIONS,
		GRID_REGION_OPTIONS,
		GRID_REGIONS,
		DEFAULT_TYPES,
		VIEW_OPTIONS
	} from '$lib/facilities/filters.js';

	/**
	 * @type {{
	 *   selectedRegions?: string[],
	 *   selectedStatuses?: string[],
	 *   selectedLoadStatuses?: string[],
	 *   selectedTypes?: string[],
	 *   loadsFeature?: boolean,
	 *   capacityRange?: [number, number],
	 *   capacityMin?: number,
	 *   capacityMax?: number,
	 *   searchTerm?: string,
	 *   selectedView?: 'list' | 'timeline' | 'grid',
	 *   isFullscreen?: boolean,
	 *   facilitySelected?: boolean,
	 *   darkMap?: boolean,
	 *   showShortcuts?: boolean,
	 *   onapply?: (changes: {
	 *     statuses?: string[],
	 *     loadStatuses?: string[],
	 *     regions?: string[],
	 *     fuelTechs?: string[],
	 *     showLoads?: boolean,
	 *     capacityRange?: [number, number],
	 *     yearRange?: [number, number]
	 *   }) => void,
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
	 *   onshortcutinvoked?: () => void
	 * }}
	 */
	let {
		selectedRegions = [],
		selectedStatuses = [],
		selectedLoadStatuses = [],
		selectedTypes = [],
		// facility_loads feature flag: off restores the pre-loads filter UI —
		// a flat Technologies tree, generator-only statuses, grid-only regions.
		// URL/server semantics are identical either way.
		loadsFeature = false,
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
		onapply,
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
		onshortcutinvoked
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
	const combinedDefaultStatuses = [
		...DEFAULT_STATUSES,
		...DEFAULT_LOAD_STATUSES.map((s) => `${LOAD_PREFIX}${s}`)
	];

	// Flag-off variants: plain Technologies tree (no Generators/Loads groups),
	// generator-only statuses without the section headers, grid-only regions.
	// Selection values are shared between the variants, so switching the flag
	// never invalidates state or URLs.
	let typeFilterLabel = $derived(loadsFeature ? 'Type' : 'Technologies');
	let typeFilterOptions = $derived(loadsFeature ? typeOptions : fuelTechOptions);
	// Both the Type and Status trees share the generators/loads group values.
	let sectionGroupsExpanded = $derived(loadsFeature ? ['generators', 'loads'] : []);
	let statusFilterOptions = $derived(loadsFeature ? combinedStatusOptions : statusOptions);
	let statusFilterDefaults = $derived(loadsFeature ? combinedDefaultStatuses : DEFAULT_STATUSES);
	let regionFilterOptions = $derived(loadsFeature ? regionOptions : GRID_REGION_OPTIONS);
	let regionFilterDefaults = $derived(loadsFeature ? ALL_REGIONS : GRID_REGIONS);
	let statusFilterSelected = $derived(loadsFeature ? combinedSelectedStatuses : selectedStatuses);

	// Under "ticked = shown", raw selected counts are permanent noise (a fresh
	// page has most boxes ticked). A filter only counts as active when it
	// deviates from its default; an empty (nothing-shown) selection counts 1.
	let typeActiveCount = $derived(activeLeafCount(typeFilterOptions, selectedTypes, DEFAULT_TYPES));
	let statusActiveCount = $derived(
		activeLeafCount(statusFilterOptions, statusFilterSelected, statusFilterDefaults)
	);
	let regionActiveCount = $derived(
		activeLeafCount(regionFilterOptions, selectedRegions, regionFilterDefaults)
	);

	// Badges the mobile Filters button and is passed into the modal so both
	// always agree. (Technology lives inside the Type tree now.)
	let activeFilterCount = $derived(typeActiveCount + statusActiveCount + regionActiveCount);

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

	// Apply handlers — both the desktop dropdowns and the mobile sheet stage
	// drafts and hand back the final selection, translated here into change
	// slices for the page's single commit point (which diffs each slice,
	// updates state once and syncs the URL with at most one navigation).

	/**
	 * @param {string[]} values
	 * @returns {{ fuelTechs: string[], showLoads: boolean }}
	 */
	function splitTypes(values) {
		return {
			fuelTechs: values.filter((v) => v !== 'data_centres'),
			showLoads: values.includes('data_centres')
		};
	}

	/**
	 * @param {string[]} values
	 * @returns {{ statuses: string[], loadStatuses?: string[] }}
	 */
	function splitStatuses(values) {
		/** @type {{ statuses: string[], loadStatuses?: string[] }} */
		const changes = { statuses: values.filter((v) => !v.startsWith(LOAD_PREFIX)) };
		// With the flag off the dropdown carries no load rows — leave that
		// state alone rather than committing an empty selection.
		if (loadsFeature) {
			changes.loadStatuses = values
				.filter((v) => v.startsWith(LOAD_PREFIX))
				.map((v) => v.slice(LOAD_PREFIX.length));
		}
		return changes;
	}

	/**
	 * @param {string[]} values
	 */
	function applyTypes(values) {
		onapply?.(splitTypes(values));
	}

	/**
	 * @param {string[]} values
	 */
	function applyRegions(values) {
		onapply?.({ regions: values });
	}

	/**
	 * @param {string[]} values
	 */
	function applyStatuses(values) {
		onapply?.(splitStatuses(values));
	}

	/**
	 * The mobile sheet commits every draft at once — translate the combined
	 * snapshot into one change set so the page issues a single navigation.
	 * @param {{ types: string[], statuses: string[], regions: string[], capacityRange: [number, number], yearRange: [number, number] }} drafts
	 */
	function applyAllFilters(drafts) {
		onapply?.({
			...splitTypes(drafts.types),
			...splitStatuses(drafts.statuses),
			regions: drafts.regions,
			capacityRange: drafts.capacityRange,
			yearRange: drafts.yearRange
		});
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

<!-- Rows in the merged Type tree: fuel-tech nodes get their coloured icon
     badge; Data Centres borrows the data_centre badge; the Generators/Loads
     group headers stay plain text. -->
{#snippet typeRow(/** @type {import('$lib/facilities/filter-options.js').FilterOption} */ option)}
	{#if option.value === 'data_centres'}
		<FuelTechRowContent option={{ ...option, value: 'data_centre' }} />
	{:else if FUEL_TECH_OPTION_VALUES.has(option.value)}
		<FuelTechRowContent {option} />
	{:else}
		<span class="capitalize flex-1 text-left truncate font-medium">{option.label}</span>
	{/if}
{/snippet}

<!-- Mobile Filter Modal -->
<MobileFilterModal
	open={showMobileFilterOptions}
	typeTitle={typeFilterLabel}
	typeOptions={typeFilterOptions}
	typeExpanded={sectionGroupsExpanded}
	regionOptions={regionFilterOptions}
	statusOptions={statusFilterOptions}
	typeDefaults={DEFAULT_TYPES}
	statusDefaults={statusFilterDefaults}
	regionDefaults={regionFilterDefaults}
	{selectedTypes}
	{selectedRegions}
	selectedStatuses={statusFilterSelected}
	{capacityRange}
	{capacityMin}
	{capacityMax}
	{formatCapacity}
	{yearRange}
	{yearMin}
	{yearMax}
	onclose={() => (showMobileFilterOptions = false)}
	onapply={applyAllFilters}
	{typeRow}
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
					options={regionFilterOptions}
					selected={selectedRegions}
					defaults={regionFilterDefaults}
					defaultExpanded={['nem']}
					compact={isFullscreen}
					clearLabel="Reset to defaults"
					onapply={applyRegions}
				/>

				<FilterDropdown
					label={typeFilterLabel}
					options={typeFilterOptions}
					selected={selectedTypes}
					defaults={DEFAULT_TYPES}
					defaultExpanded={sectionGroupsExpanded}
					searchable
					searchPlaceholder="Search technologies"
					compact={isFullscreen}
					clearLabel="Reset to defaults"
					listMaxHeight={460}
					onapply={applyTypes}
					row={typeRow}
				/>

				<FilterDropdown
					label="Status"
					options={statusFilterOptions}
					selected={statusFilterSelected}
					defaults={statusFilterDefaults}
					defaultExpanded={sectionGroupsExpanded}
					compact={isFullscreen}
					clearLabel="Reset to defaults"
					onapply={applyStatuses}
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
