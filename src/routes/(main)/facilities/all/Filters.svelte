<script>
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';
	import { Search, X, CalendarClock, List, Map } from '@lucide/svelte';
	import SwitchWithIcons from '$lib/components/SwitchWithIcons.svelte';

	import { regions, fuelTechOptions, statusOptions, sizeOptions } from '../_utils/filters.js';

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

	let showMobileFilterOptions = $state(false);
	let showMobileSearch = $state(false);

	/** @type {HTMLInputElement | null} */
	let mobileSearchInput = $state(null);
	/** @type {HTMLInputElement | null} */
	let desktopSearchInput = $state(null);

	/**
	 * Handle keyboard shortcut '/' to focus search input
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		// Ignore if user is typing in an input, textarea, or contenteditable
		const target = /** @type {HTMLElement} */ (e.target);
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.isContentEditable
		) {
			return;
		}

		if (e.key === '/') {
			e.preventDefault();
			// Check if we're on mobile (md breakpoint is 768px)
			if (window.innerWidth < 768) {
				showMobileSearch = true;
				setTimeout(() => mobileSearchInput?.focus(), 50);
			} else {
				desktopSearchInput?.focus();
			}
		}
	}

	// Local search state for immediate UI feedback
	let localSearchTerm = $state(searchTerm);

	// Debounce timer
	/** @type {ReturnType<typeof setTimeout> | null} */
	let debounceTimer = $state(null);

	/**
	 * Debounced search handler - updates UI immediately, debounces callback
	 * @param {string} value
	 */
	function handleDebouncedSearch(value) {
		localSearchTerm = value;

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			onsearchchange?.(value);
		}, 150);
	}

	// Sync local state when prop changes (e.g., from URL)
	$effect(() => {
		localSearchTerm = searchTerm;
	});

	let regionOptions = $derived(
		regions.map((r) => ({
			label: r.label,
			value: r.value,
			divider: r.divider,
			labelClassName: regions?.find((m) => m.value === r.longValue)
				? ''
				: 'italic text-mid-warm-grey'
		}))
	);

	let regionLabel = $derived.by(() => {
		if (selectedRegions.length === 0) {
			return 'Region';
		} else if (selectedRegions.length === 1) {
			let region = regions.find((r) => r.value === selectedRegions[0]);
			return region?.longLabel || selectedRegions[0];
		} else {
			return `${selectedRegions.length} Regions`;
		}
	});

	let statusLabel = $derived.by(() => {
		if (selectedStatuses.length === 0) {
			return 'Status';
		} else if (selectedStatuses.length === 1) {
			let status = statusOptions.find((s) => s.value === selectedStatuses[0]);
			return status?.label || selectedStatuses[0];
		} else {
			return `${selectedStatuses.length} Statuses`;
		}
	});

	let fuelTechLabel = $derived.by(() => {
		if (selectedFuelTechs.length === 0) {
			return 'Technology';
		} else if (selectedFuelTechs.length === 1) {
			let fuelTech = fuelTechOptions.find((ft) => ft.value === selectedFuelTechs[0]);
			return fuelTech?.label || selectedFuelTechs[0];
		} else {
			return `${selectedFuelTechs.length} Technologies`;
		}
	});

	let sizeLabel = $derived.by(() => {
		if (selectedSizes.length === 0) {
			return 'Size';
		} else if (selectedSizes.length === 1) {
			let size = sizeOptions.find((s) => s.value === selectedSizes[0]);
			return size?.label || selectedSizes[0];
		} else {
			return `${selectedSizes.length} Sizes`;
		}
	});

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleRegionChange(value, isMetaPressed) {
		let newSelectedRegions = [];
		if (isMetaPressed) {
			newSelectedRegions = [value];
		} else if (selectedRegions.includes(value)) {
			newSelectedRegions = selectedRegions.filter((item) => item !== value);
		} else {
			newSelectedRegions = [...selectedRegions, value];
		}

		onregionschange?.(newSelectedRegions);
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleFuelTechChange(value, isMetaPressed) {
		let newSelectedFuelTechs = [];
		if (isMetaPressed) {
			newSelectedFuelTechs = [value];
		} else if (selectedFuelTechs.includes(value)) {
			newSelectedFuelTechs = selectedFuelTechs.filter((item) => item !== value);
		} else {
			newSelectedFuelTechs = [...selectedFuelTechs, value];
		}

		onfueltechschange?.(newSelectedFuelTechs);
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleStatusesChange(value, isMetaPressed) {
		let newSelectedStatuses = [];
		if (isMetaPressed) {
			newSelectedStatuses = [value];
		} else if (selectedStatuses.includes(value)) {
			newSelectedStatuses = selectedStatuses.filter((item) => item !== value);
		} else {
			newSelectedStatuses = [...selectedStatuses, value];
		}

		onstatuseschange?.(newSelectedStatuses);
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleSizeChange(value, isMetaPressed) {
		let newSelectedSizes = [];
		if (isMetaPressed) {
			newSelectedSizes = [value];
		} else if (selectedSizes.includes(value)) {
			newSelectedSizes = selectedSizes.filter((item) => item !== value);
		} else {
			newSelectedSizes = [...selectedSizes, value];
		}

		onsizeschange?.(newSelectedSizes);
	}

	// View switcher buttons for desktop (Timeline, List)
	const viewButtonsDesktop = [
		{ label: 'Timeline', value: 'timeline', icon: CalendarClock, size: 'size-6' },
		{ label: 'List', value: 'list', icon: List, size: 'size-6' }
	];

	// View switcher buttons for mobile (Timeline, List, Map)
	const viewButtonsMobile = [
		{ label: 'Timeline', value: 'timeline', icon: CalendarClock, size: 'size-6' },
		{ label: 'List', value: 'list', icon: List, size: 'size-6' },
		{ label: 'Map', value: 'map', icon: Map, size: 'size-6' }
	];

	/**
	 * @param {{ value: string }} option
	 */
	function handleViewChange(option) {
		onviewchange?.(/** @type {'list' | 'timeline' | 'map'} */ (option.value));
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if showMobileFilterOptions}
	<Modal
		maxWidthClass=""
		class="fixed! bg-white top-0 bottom-0 left-0 right-0 overflow-y-auto overscroll-contain rounded-none! my-0! pt-0 px-0 z-50"
	>
		<header
			class="sticky top-0 z-50 bg-white pb-2 pt-6 px-10 flex justify-between items-center border-b border-warm-grey"
		>
			<h3 class="mb-2">Filters</h3>

			<div class="mb-2">
				<IconAdjustmentsHorizontal class="size-10" />
			</div>
		</header>

		<section class="p-10 pb-0 w-full flex gap-10">
			<div class="flex flex-col gap-5">
				<FormMultiSelect
					options={regionOptions}
					selected={selectedRegions}
					label="Region"
					paddingX=""
					staticDisplay={true}
					onchange={(value, isMetaPressed) => handleRegionChange(value, isMetaPressed)}
				/>
				<FormMultiSelect
					options={statusOptions}
					selected={selectedStatuses}
					label="Status"
					withColours={true}
					paddingX=""
					staticDisplay={true}
					onchange={(value, isMetaPressed) => handleStatusesChange(value, isMetaPressed)}
				/>
				<FormMultiSelect
					options={sizeOptions}
					selected={selectedSizes}
					label="Size"
					paddingX=""
					staticDisplay={true}
					onchange={(value, isMetaPressed) => handleSizeChange(value, isMetaPressed)}
				/>
			</div>

			<FormMultiSelect
				options={fuelTechOptions}
				selected={selectedFuelTechs}
				label="Technology"
				paddingX=""
				staticDisplay={true}
				onchange={(value, isMetaPressed) => handleFuelTechChange(value, isMetaPressed)}
			/>
		</section>

		{#snippet buttons()}
			<div class="flex gap-3">
				<Button
					class="bg-dark-grey! text-white hover:bg-black! w-full"
					onclick={() => (showMobileFilterOptions = false)}>Close</Button
				>
			</div>
		{/snippet}
	</Modal>
{/if}

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

			<!-- Desktop search input -->
			<div class="hidden md:flex items-center ml-6 pl-6 border-l border-warm-grey">
				<input
					bind:this={desktopSearchInput}
					type="search"
					value={localSearchTerm}
					oninput={(e) => handleDebouncedSearch(/** @type {HTMLInputElement} */ (e.target).value)}
					placeholder="Filter by name"
					class="rounded-full border border-warm-grey bg-white px-5 py-4 text-sm transition-colors hover:border-dark-grey focus:border-dark-grey focus:outline-none w-[200px]"
				/>
			</div>

			<div class="justify-start items-center gap-2 hidden md:flex ml-6 pl-6 border-l border-warm-grey">
				<FormMultiSelect
					options={regionOptions}
					selected={selectedRegions}
					label={regionLabel}
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					onchange={(value, isMetaPressed) => handleRegionChange(value, isMetaPressed)}
				/>

				<FormMultiSelect
					options={statusOptions}
					selected={selectedStatuses}
					label={statusLabel}
					withColours={true}
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					onchange={(value, isMetaPressed) => handleStatusesChange(value, isMetaPressed)}
				/>

				<FormMultiSelect
					options={fuelTechOptions}
					selected={selectedFuelTechs}
					label={fuelTechLabel}
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					onchange={(value, isMetaPressed) => handleFuelTechChange(value, isMetaPressed)}
				/>

				<FormMultiSelect
					options={sizeOptions}
					selected={selectedSizes}
					label={sizeLabel}
					paddingX="pl-5 pr-4"
					paddingY="py-3"
					onchange={(value, isMetaPressed) => handleSizeChange(value, isMetaPressed)}
				/>
			</div>
		</div>

		<!-- Mobile search button/input -->
		<div class="md:hidden flex items-center justify-end gap-2 flex-1 my-2">
			{#if showMobileSearch}
				<div class="flex items-center gap-2 w-full">
					<input
						bind:this={mobileSearchInput}
						type="search"
						value={localSearchTerm}
						oninput={(e) => handleDebouncedSearch(/** @type {HTMLInputElement} */ (e.target).value)}
						placeholder="Filter by name"
						class="rounded-full border border-warm-grey bg-white px-5 py-4 text-sm transition-colors focus:border-dark-grey focus:outline-none flex-1"
					/>
					<button
						class="p-3 rounded-full hover:bg-warm-grey transition-colors cursor-pointer"
						onclick={() => {
							showMobileSearch = false;
							localSearchTerm = '';
							onsearchchange?.('');
						}}
					>
						<X class="size-5 text-mid-grey" />
					</button>
				</div>
			{:else}
				<button
					class="p-4 rounded-full border border-warm-grey bg-white hover:border-dark-grey transition-colors cursor-pointer"
					onclick={() => {
						showMobileSearch = true;
						setTimeout(() => mobileSearchInput?.focus(), 50);
					}}
				>
					<Search class="size-6 text-mid-grey" />
				</button>
			{/if}
		</div>
	</div>

	<div class="md:hidden pl-4 ml-2 border-l border-warm-grey">
		<ButtonIcon onclick={() => (showMobileFilterOptions = true)}>
			<IconAdjustmentsHorizontal class="size-10" />
		</ButtonIcon>
	</div>
</div>
