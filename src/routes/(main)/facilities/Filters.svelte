<script>
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import HierarchicalMultiSelect from './_components/HierarchicalMultiSelect.svelte';
	import MobileFilterModal from './_components/MobileFilterModal.svelte';
	import SearchInput from './_components/SearchInput.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';
	import { Search, X, CalendarClock, List, Map } from '@lucide/svelte';
	import SwitchWithIcons from '$lib/components/SwitchWithIcons.svelte';

	import {
		regions,
		fuelTechOptions,
		getFlatFuelTechOptions,
		getParentFuelTechValues,
		statusOptions,
		sizeOptions
	} from './_utils/filters.js';

	/**
	 * @type {{
	 *   selectedRegions?: string[],
	 *   selectedStatuses?: string[],
	 *   selectedFuelTechs?: string[],
	 *   selectedSizes?: string[],
	 *   searchTerm?: string,
	 *   selectedView?: 'list' | 'timeline' | 'map',
	 *   onstatuseschange?: (values: string[]) => void,
	 *   onregionschange?: (values: string[]) => void,
	 *   onfueltechschange?: (values: string[]) => void,
	 *   onsizeschange?: (values: string[]) => void,
	 *   onsearchchange?: (value: string) => void,
	 *   onviewchange?: (view: 'list' | 'timeline' | 'map') => void
	 * }}
	 */
	let {
		selectedRegions = [],
		selectedStatuses = [],
		selectedFuelTechs = [],
		selectedSizes = [],
		searchTerm = '',
		selectedView = 'timeline',
		onstatuseschange,
		onregionschange,
		onfueltechschange,
		onsizeschange,
		onsearchchange,
		onviewchange
	} = $props();

	// ============================================
	// Local State
	// ============================================

	let showMobileFilterOptions = $state(false);
	let showMobileSearch = $state(false);

	/** @type {SearchInput | null} */
	let mobileSearchRef = $state(null);
	/** @type {SearchInput | null} */
	let desktopSearchRef = $state(null);

	// ============================================
	// Derived Options
	// ============================================

	let regionOptions = $derived(
		regions.map((r) => ({
			label: r.label,
			value: r.value ?? '',
			divider: r.divider,
			labelClassName: regions?.find((m) => m.value === r.longValue)
				? ''
				: 'italic text-mid-warm-grey'
		}))
	);

	// ============================================
	// Derived Labels
	// ============================================

	let regionLabel = $derived.by(() => {
		if (selectedRegions.length === 0) return 'Region';
		if (selectedRegions.length === 1) {
			const region = regions.find((r) => r.value === selectedRegions[0]);
			return region?.longLabel || selectedRegions[0];
		}
		return `${selectedRegions.length} Regions`;
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

	let sizeLabel = $derived.by(() => {
		if (selectedSizes.length === 0) return 'Size';
		if (selectedSizes.length === 1) {
			const size = sizeOptions.find((s) => s.value === selectedSizes[0]);
			return size?.label || selectedSizes[0];
		}
		return `${selectedSizes.length} Sizes`;
	});

	// ============================================
	// View Switcher Config
	// ============================================

	const viewButtonsDesktop = [
		{ label: 'Timeline', value: 'timeline', icon: CalendarClock, size: 'size-6' },
		{ label: 'List', value: 'list', icon: List, size: 'size-6' }
	];

	const viewButtonsMobile = [
		{ label: 'Timeline', value: 'timeline', icon: CalendarClock, size: 'size-6' },
		{ label: 'List', value: 'list', icon: List, size: 'size-6' },
		{ label: 'Map', value: 'map', icon: Map, size: 'size-6' }
	];

	// ============================================
	// Event Handlers
	// ============================================

	/**
	 * Handle keyboard shortcut '/' to focus search input
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
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleRegionChange(value, isMetaPressed) {
		onregionschange?.(toggleSelection(selectedRegions, value, isMetaPressed));
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleStatusChange(value, isMetaPressed) {
		onstatuseschange?.(toggleSelection(selectedStatuses, value, isMetaPressed));
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleSizeChange(value, isMetaPressed) {
		onsizeschange?.(toggleSelection(selectedSizes, value, isMetaPressed));
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

	function closeMobileSearch() {
		showMobileSearch = false;
		onsearchchange?.('');
	}

	function openMobileSearch() {
		showMobileSearch = true;
		setTimeout(() => mobileSearchRef?.focus(), 50);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Mobile Filter Modal -->
<MobileFilterModal
	open={showMobileFilterOptions}
	{regionOptions}
	{statusOptions}
	{fuelTechOptions}
	{sizeOptions}
	{selectedRegions}
	{selectedStatuses}
	{selectedFuelTechs}
	{selectedSizes}
	onclose={() => (showMobileFilterOptions = false)}
	onregionschange={(values, isMetaPressed) => handleRegionChange(values[0], isMetaPressed)}
	onstatuseschange={(values, isMetaPressed) => handleStatusChange(values[0], isMetaPressed)}
	onfueltechschange={handleFuelTechChange}
	onsizeschange={(values, isMetaPressed) => handleSizeChange(values[0], isMetaPressed)}
	onclearregions={() => onregionschange?.([])}
	onclearstatuses={() => onstatuseschange?.([])}
	onclearfueltechs={() => onfueltechschange?.([])}
	onclearsizes={() => onsizeschange?.([])}
/>

<div class="flex items-center justify-between pt-3 pb-3 px-8 relative z-10 gap-4">
	<div class="flex items-center gap-2 justify-between w-full">
		<div class="flex items-center gap-4">
			<!-- View Switcher - Desktop -->
			<div class="hidden md:block">
				<SwitchWithIcons
					buttons={viewButtonsDesktop}
					selected={selectedView}
					onchange={handleViewChange}
				/>
			</div>

			<!-- View Switcher - Mobile (includes Map) -->
			{#if !showMobileSearch}
				<div class="md:hidden">
					<SwitchWithIcons
						buttons={viewButtonsMobile}
						selected={selectedView}
						onchange={handleViewChange}
					/>
				</div>
			{/if}

			<!-- Desktop Search -->
			<div class="hidden md:flex items-center ml-6 pl-6 border-l border-warm-grey">
				<SearchInput
					bind:this={desktopSearchRef}
					value={searchTerm}
					onchange={(value) => onsearchchange?.(value)}
					class="w-[200px]"
				/>
			</div>

			<!-- Desktop Filter Dropdowns -->
			<div
				class="justify-start items-center gap-2 hidden md:flex ml-6 pl-6 border-l border-warm-grey"
			>
				<FormMultiSelect
					options={regionOptions}
					selected={selectedRegions}
					label={regionLabel}
					paddingX="pl-5 pr-4"
					paddingY="py-3"
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

				<FormMultiSelect
					options={sizeOptions}
					selected={selectedSizes}
					label={sizeLabel}
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					onchange={handleSizeChange}
					onclear={() => onsizeschange?.([])}
				/>
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

	<!-- Mobile Filter Button -->
	<div class="md:hidden pl-4 ml-0 border-l border-warm-grey">
		<ButtonIcon onclick={() => (showMobileFilterOptions = true)}>
			<IconAdjustmentsHorizontal class="size-10" />
		</ButtonIcon>
	</div>
</div>
