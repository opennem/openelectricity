<script>
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import HierarchicalMultiSelect from './_components/HierarchicalMultiSelect.svelte';
	import MobileFilterModal from './_components/MobileFilterModal.svelte';
	import SearchInput from './_components/SearchInput.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import { Search, X, CalendarClock, List, Map, Maximize2, Minimize2, Play, Pause, Square } from '@lucide/svelte';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { fly } from 'svelte/transition';
	import { onDestroy } from 'svelte';
	import SwitchWithIcons from '$lib/components/SwitchWithIcons.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import RangeDropdown from '$lib/components/ui/range-slider/RangeDropdown.svelte';
	import RangeSlider from '$lib/components/ui/range-slider/RangeSlider.svelte';

	import {
		regions,
		regionOptions,
		fuelTechOptions,
		getFlatFuelTechOptions,
		getFlatRegionOptions,
		getParentFuelTechValues,
		getParentRegionValues,
		statusOptions
	} from './_utils/filters.js';

	/**
	 * @type {{
	 *   selectedRegions?: string[],
	 *   selectedStatuses?: string[],
	 *   selectedFuelTechs?: string[],
	 *   capacityRange?: [number, number],
	 *   capacityMin?: number,
	 *   capacityMax?: number,
	 *   searchTerm?: string,
	 *   selectedView?: 'list' | 'timeline' | 'map',
	 *   isFullscreen?: boolean,
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
	 *   onviewchange?: (view: 'list' | 'timeline' | 'map') => void,
	 *   onfullscreenchange?: () => void,
	 *   onyearplayingchange?: (playing: boolean) => void
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
		selectedView = 'timeline',
		isFullscreen = false,
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
		onyearplayingchange
	} = $props();

	// ============================================
	// Local State
	// ============================================

	let showMobileFilterOptions = $state(false);
	let showMobileSearch = $state(false);
	let isBrowserFullscreen = $state(false);

	/** @type {SearchInput | null} */
	let mobileSearchRef = $state(null);
	/** @type {SearchInput | null} */
	let desktopSearchRef = $state(null);

	// ============================================
	// Year Dropdown & Animation (Play button)
	// ============================================

	let showYearDropdown = $state(false);
	let isYearPlaying = $state(false);
	/** @type {ReturnType<typeof setInterval> | null} */
	let yearPlayInterval = $state(null);
	let animationEndYear = 0;

	let isYearFiltered = $derived(yearRange[0] > yearMin || yearRange[1] < yearMax);
	let yearDisplayLabel = $derived.by(() => {
		if (!isYearFiltered) return 'Years';
		return `${formatYear(yearRange[0])} – ${formatYear(yearRange[1])}`;
	});

	// Show external stop button when playing but dropdown is closed
	let showYearStopButton = $derived(isYearPlaying && !showYearDropdown);

	function startYearAnimation() {
		// Capture the selected end year as the animation upper bound
		animationEndYear = yearRange[1];

		// Reset to start of range
		onyearrangechange?.([yearRange[0], yearRange[0]]);

		isYearPlaying = true;
		onyearplayingchange?.(true);
		yearPlayInterval = setInterval(() => {
			const nextEnd = yearRange[1] + 1;

			if (nextEnd > animationEndYear) {
				onyearrangechange?.([yearRange[0], animationEndYear]);
				stopYearAnimation();
				return;
			}

			onyearrangechange?.([yearRange[0], nextEnd]);
		}, 200);
	}

	function stopYearAnimation() {
		isYearPlaying = false;
		onyearplayingchange?.(false);
		if (yearPlayInterval) {
			clearInterval(yearPlayInterval);
			yearPlayInterval = null;
		}
	}

	function handleYearDropdownScroll() {
		if (!isYearPlaying) {
			showYearDropdown = false;
		}
	}

	function handleYearClear() {
		stopYearAnimation();
		onyearrangechange?.([yearMin, yearMax]);
	}

	function toggleYearAnimation() {
		if (isYearPlaying) {
			stopYearAnimation();
		} else {
			startYearAnimation();
		}
	}

	// Stop animation if view changes
	/** @type {string} */
	let prevSelectedView = $state('');
	$effect(() => {
		if (prevSelectedView && selectedView !== prevSelectedView) {
			stopYearAnimation();
		}
		prevSelectedView = selectedView;
	});

	onDestroy(() => {
		stopYearAnimation();
	});

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
		isBrowserFullscreen = !!document.fullscreenElement;
		// When exiting browser fullscreen, also exit app fullscreen
		if (!isBrowserFullscreen && isFullscreen) {
			onfullscreenchange?.();
		}
	}

	// ============================================
	// Derived Labels
	// ============================================

	let flatRegionOptions = getFlatRegionOptions();
	let parentRegionValues = getParentRegionValues();

	let regionLabel = $derived.by(() => {
		// Filter out parent categories (only count actual regions)
		const countableRegions = selectedRegions.filter((r) => !parentRegionValues.includes(r));

		if (countableRegions.length === 0) return 'Region';
		if (countableRegions.length === 1) {
			const region = flatRegionOptions.find((r) => r.value === countableRegions[0]);
			return region?.label || countableRegions[0];
		}
		return `${countableRegions.length} Regions`;
	});

	let statusLabel = $derived.by(() => {
		if (selectedStatuses.length === 0) return 'Status';
		if (selectedStatuses.length === 1) {
			const status = statusOptions.find((s) => s.value === selectedStatuses[0]);
			return status?.label || selectedStatuses[0];
		}
		return `${selectedStatuses.length} Statuses`;
	});

	let flatFuelTechOptions = getFlatFuelTechOptions();
	let parentFuelTechValues = getParentFuelTechValues();

	let fuelTechLabel = $derived.by(() => {
		// Filter out parent categories (only count actual sub-technologies)
		const countableTechs = selectedFuelTechs.filter((ft) => !parentFuelTechValues.includes(ft));

		if (countableTechs.length === 0) return 'Technology';
		if (countableTechs.length === 1) {
			const fuelTech = flatFuelTechOptions.find((ft) => ft.value === countableTechs[0]);
			return fuelTech?.label || countableTechs[0];
		}
		return `${countableTechs.length} Technologies`;
	});

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
	// View Switcher Config
	// ============================================

	const viewButtonsDesktop = [
		{ label: 'Timeline', value: 'timeline', icon: CalendarClock, size: 'size-6' },
		{ label: 'List', value: 'list', icon: List, size: 'size-6' }
	];

	const viewOptions = [
		{ label: 'Timeline', value: 'timeline' },
		{ label: 'List', value: 'list' },
		{ label: 'Map', value: 'map' }
	];

	let selectedViewOption = $derived(viewOptions.find((v) => v.value === selectedView));

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
				showMobileSearch = true;
				setTimeout(() => mobileSearchRef?.focus(), 50);
			} else {
				desktopSearchRef?.focus();
			}
		}

		// Shift+F for browser fullscreen
		if ((e.key === 'f' || e.key === 'F') && e.shiftKey) {
			e.preventDefault();
			toggleBrowserFullscreen();
			return;
		}

		// F for app fullscreen (maximized mode)
		if (e.key === 'f' || e.key === 'F') {
			e.preventDefault();
			onfullscreenchange?.();
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
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleStatusChange(value, isMetaPressed) {
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
		onviewchange?.(/** @type {'list' | 'timeline' | 'map'} */ (option.value));
	}

	/**
	 * @param {{ value: string | number | null | undefined }} option
	 */
	function handleViewSelectChange(option) {
		if (option.value) {
			onviewchange?.(/** @type {'list' | 'timeline' | 'map'} */ (option.value));
		}
	}

	function closeMobileSearch() {
		showMobileSearch = false;
		onsearchchange?.('');
	}

	function openMobileSearch() {
		showMobileSearch = true;
		setTimeout(() => mobileSearchRef?.focus(), 50);
	}
</script>

<svelte:window onkeydown={handleKeydown} onscroll={handleYearDropdownScroll} />
<svelte:document onfullscreenchange={handleFullscreenChange} />

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
	onstatuseschange={(values, isMetaPressed) => handleStatusChange(values[0], isMetaPressed)}
	onfueltechschange={handleFuelTechChange}
	oncapacityrangechange={(range) => oncapacityrangechange?.(range)}
	{yearRange}
	{yearMin}
	{yearMax}
	onyearrangechange={(range) => {
		stopYearAnimation();
		onyearrangechange?.(range);
	}}
	onclearyears={() => {
		stopYearAnimation();
		onyearrangechange?.([yearMin, yearMax]);
	}}
	{isYearPlaying}
	ontoggleyearanimation={toggleYearAnimation}
	ghostYearRange={isYearPlaying ? [yearRange[0], animationEndYear] : null}
	{selectedView}
	onclearregions={() => onregionschange?.([])}
	onclearstatuses={() => onstatuseschange?.([])}
	onclearfueltechs={() => onfueltechschange?.([])}
	onclearcapacity={() => oncapacityrangechange?.([capacityMin, capacityMax])}
/>

<div class="flex items-center justify-between pt-3 pb-3 px-8 relative z-10 gap-4">
	<div class="flex items-center gap-2 justify-between w-full">
		<div class="flex items-center gap-4">
			<!-- Logo Mark - Fullscreen only (click to exit fullscreen) -->
			{#if isFullscreen}
				<button
					onclick={() => onfullscreenchange?.()}
					class="flex items-center cursor-pointer"
					title="Exit full screen"
				>
					<img src="/logo-mark.png" alt="Open Electricity" class="h-10 w-auto" />
				</button>
			{/if}

			<!-- View Switcher - Desktop -->
			<div class="hidden md:block">
				<SwitchWithIcons
					buttons={viewButtonsDesktop}
					selected={selectedView}
					onchange={handleViewChange}
				/>
			</div>

			<!-- View Switcher - Mobile (dropdown) -->
			{#if !showMobileSearch}
				<!-- Fullscreen Toggle - Mobile -->
				<div class="md:hidden">
					<button
						onclick={() => onfullscreenchange?.()}
						class="p-3 rounded-full border border-warm-grey bg-white hover:border-dark-grey transition-colors cursor-pointer"
						title={isFullscreen
							? 'Exit full screen (F or Esc). Shift+F for browser fullscreen'
							: 'Enter full screen (F). Shift+F for browser fullscreen'}
					>
						{#if isFullscreen}
							<Minimize2 class="size-7 text-mid-grey" />
						{:else}
							<Maximize2 class="size-7 text-mid-grey" />
						{/if}
					</button>
				</div>

				<div class="md:hidden">
					<FormSelect
						options={viewOptions}
						selected={selectedViewOption}
						onchange={handleViewSelectChange}
						paddingX="px-4"
						paddingY="py-3"
						widthClass="w-auto"
					/>
				</div>

				{#if selectedView === 'map'}
					<div class="md:hidden flex items-center gap-1">
						<span class="text-xs text-mid-grey whitespace-nowrap">{yearDisplayLabel}</span>
						<button
							onclick={toggleYearAnimation}
							class="p-1.5 rounded-md hover:bg-light-warm-grey transition-colors cursor-pointer"
							title={isYearPlaying ? 'Pause' : 'Play'}
						>
							{#if isYearPlaying}
								<Pause class="size-4 text-mid-grey" />
							{:else}
								<Play class="size-4 text-mid-grey" />
							{/if}
						</button>
					</div>
				{/if}
			{/if}

			<!-- Desktop Search -->
			<div class="relative hidden md:flex items-center ml-6 pl-6 border-l border-warm-grey">
				<SearchInput
					bind:this={desktopSearchRef}
					value={searchTerm}
					onchange={(value) => onsearchchange?.(value)}
					class="w-[200px]"
				/>
				{#if showShortcuts}
					<div class="absolute left-1/2 -translate-x-1/2 -bottom-7 pointer-events-none z-10">
						<kbd class="text-xs font-sans text-dark-grey bg-white border border-dark-grey/30 rounded-md px-2 py-1 shadow-sm ring-1 ring-dark-grey/10">/</kbd>
					</div>
				{/if}
			</div>

			<!-- Desktop Filter Dropdowns -->
			<div
				class="justify-start items-center gap-2 hidden md:flex ml-6 pl-6 border-l border-warm-grey"
			>
				<HierarchicalMultiSelect
					options={regionOptions}
					selected={selectedRegions}
					label={regionLabel}
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					defaultExpanded={['nem']}
					onchange={handleRegionChange}
					onclear={() => onregionschange?.([])}
				/>

				<FormMultiSelect
					options={statusOptions}
					selected={selectedStatuses}
					label={statusLabel}
					withColours={true}
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					onchange={handleStatusChange}
					onclear={() => onstatuseschange?.([])}
				/>

				<HierarchicalMultiSelect
					options={fuelTechOptions}
					selected={selectedFuelTechs}
					label={fuelTechLabel}
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					onchange={handleFuelTechChange}
					onclear={() => onfueltechschange?.([])}
				/>

				<RangeDropdown
					min={capacityMin}
					max={capacityMax}
					value={capacityRange}
					step={10}
					label="Capacity"
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					onchange={(range) => oncapacityrangechange?.(range)}
					onclear={() => oncapacityrangechange?.([capacityMin, capacityMax])}
					formatValue={formatCapacity}
				/>

				<!-- Years dropdown (inline for play/pause control) -->
				<div
					class="relative text-base"
					use:clickoutside
					onclickoutside={() => (showYearDropdown = false)}
				>
					<div
						role="button"
						tabindex="0"
						onclick={() => (showYearDropdown = !showYearDropdown)}
						onkeydown={(e) => e.key === 'Enter' && (showYearDropdown = !showYearDropdown)}
						class="flex items-center gap-8 pl-5 pr-4 py-3 rounded-lg whitespace-nowrap cursor-pointer"
						class:hover:bg-warm-grey={!showYearDropdown}
					>
						<span class="font-semibold text-sm md:text-base">
							{yearDisplayLabel}
						</span>

						<div class="flex items-center gap-1">
							{#if isYearFiltered}
								<button
									onclick={(e) => {
										e.stopPropagation();
										handleYearClear();
									}}
									class="p-1 rounded-full hover:bg-mid-warm-grey transition-colors"
									title="Clear selection"
								>
									<X class="size-4 text-mid-grey" />
								</button>
							{/if}
							<IconChevronUpDown class="w-7 h-7" />
						</div>
					</div>

					{#if showYearDropdown}
						<div
							class="border border-mid-grey bg-white absolute top-14 left-0 flex flex-col rounded-lg z-50 shadow-md p-4 min-w-[250px]"
							transition:fly={{ y: -10, duration: 150 }}
						>
							<RangeSlider
								min={yearMin}
								max={yearMax}
								value={yearRange}
								step={1}
								onchange={(range) => {
									stopYearAnimation();
									onyearrangechange?.(range);
								}}
								formatValue={formatYear}
								ghostRange={isYearPlaying ? [yearRange[0], animationEndYear] : null}
							/>

							<div class="border-t border-warm-grey mt-4 pt-4">
								<button
									onclick={toggleYearAnimation}
									class="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-light-warm-grey hover:bg-warm-grey transition-colors cursor-pointer text-sm text-mid-grey"
									title={isYearPlaying ? 'Pause year animation' : 'Play year animation'}
								>
									{#if isYearPlaying}
										<Pause class="size-4" />
										<span>Pause</span>
									{:else}
										<Play class="size-4" />
										<span>Play</span>
									{/if}
								</button>
							</div>
						</div>
					{/if}
				</div>

				<!-- Stop button (visible when playing with dropdown closed) -->
				{#if showYearStopButton}
					<button
						onclick={stopYearAnimation}
						class="p-2 rounded-lg hover:bg-light-warm-grey transition-colors cursor-pointer"
						title="Stop year animation"
					>
						<Square class="size-4 text-mid-grey fill-mid-grey" />
					</button>
				{/if}
			</div>
		</div>

		<!-- Mobile Search -->
		<div class="md:hidden flex items-center justify-end gap-2 flex-1 my-2">
			{#if showMobileSearch}
				<div class="flex items-center gap-2 w-full">
					<SearchInput
						bind:this={mobileSearchRef}
						value={searchTerm}
						onchange={(value) => onsearchchange?.(value)}
						class="flex-1"
					/>
					<button
						class="p-3 rounded-full hover:bg-warm-grey transition-colors cursor-pointer"
						onclick={closeMobileSearch}
					>
						<X class="size-5 text-mid-grey" />
					</button>
				</div>
			{:else}
				<button
					class="p-4 rounded-full border border-warm-grey bg-white hover:border-dark-grey transition-colors cursor-pointer"
					onclick={openMobileSearch}
				>
					<Search class="size-6 text-mid-grey" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Fullscreen Toggle - Desktop -->
	<div class="relative hidden md:flex items-center pl-4 ml-4 border-l border-warm-grey">
		<button
			onclick={() => onfullscreenchange?.()}
			class="p-2 rounded-lg hover:bg-light-warm-grey transition-colors cursor-pointer"
			title={isFullscreen
				? 'Exit full screen (F or Esc). Shift+F for browser fullscreen'
				: 'Enter full screen (F). Shift+F for browser fullscreen'}
		>
			{#if isFullscreen}
				<Minimize2 class="size-6 text-mid-grey" />
			{:else}
				<Maximize2 class="size-6 text-mid-grey" />
			{/if}
		</button>
		{#if showShortcuts}
			<div class="absolute left-1/2 -translate-x-1/2 -bottom-7 pointer-events-none z-10">
				<kbd class="text-xs font-sans text-dark-grey bg-white border border-dark-grey/30 rounded-md px-2 py-1 shadow-sm ring-1 ring-dark-grey/10">F</kbd>
			</div>
		{/if}
	</div>

	<!-- Mobile Filter Button -->
	<div class="md:hidden pl-2 ml-0">
		<ButtonIcon onclick={() => (showMobileFilterOptions = true)}>
			<IconAdjustmentsHorizontal class="size-10" />
		</ButtonIcon>
	</div>
</div>
