<script>
	import { tick } from 'svelte';
	import { ChevronUp, ChevronDown } from '@lucide/svelte';
	import FacilityCard from './_components/FacilityCard.svelte';
	import { scrollToFacilityIfNeeded } from './_utils/scroll-utils';
	import { sortFacilities } from './_utils/sort-facilities';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { CAPACITY_TOOLTIP } from './_utils/capacity-tooltip.js';

	/**
	 * @type {{
	 *   facilities: any[],
	 *   hoveredFacility?: any | null,
	 *   clickedFacility?: any | null,
	 *   selectedFacilityCode?: string | null,
	 *   sortBy?: 'name' | 'region' | 'storage' | 'capacity',
	 *   sortOrder?: 'asc' | 'desc',
	 *   onhover?: (facility: any | null) => void,
	 *   onclick?: (facility: any) => void,
	 *   onsortchange?: (sortBy: 'name' | 'region' | 'storage' | 'capacity', sortOrder: 'asc' | 'desc') => void
	 * }}
	 */
	let {
		facilities = [],
		hoveredFacility = null,
		clickedFacility = null,
		selectedFacilityCode = null,
		sortBy = 'name',
		sortOrder = 'asc',
		onhover,
		onclick,
		onsortchange
	} = $props();

	let sortedFacilities = $derived(sortFacilities(facilities, sortBy, sortOrder));

	/**
	 * Handle sort column click
	 * @param {'name' | 'region' | 'storage' | 'capacity'} column
	 */
	function handleSort(column) {
		/** @type {'asc' | 'desc'} */
		let newOrder;
		/** @type {'name' | 'region' | 'storage' | 'capacity'} */
		let newSortBy = column;

		if (sortBy === column) {
			newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			newOrder = column === 'capacity' || column === 'storage' ? 'desc' : 'asc';
		}

		onsortchange?.(newSortBy, newOrder);
	}

	// Scroll to facility when clickedFacility changes (from map click)
	$effect(() => {
		if (clickedFacility) {
			tick().then(() => {
				scrollToFacilityIfNeeded(clickedFacility.code, 'smooth', 'nearest');
			});
		}
	});

	// Scroll to selected facility if not in view
	$effect(() => {
		if (selectedFacilityCode && facilities.length > 0) {
			tick().then(() => {
				scrollToFacilityIfNeeded(selectedFacilityCode, 'auto', 'center');
			});
		}
	});

	/**
	 * @param {any} f
	 */
	function handleMouseEnter(f) {
		onhover?.(f);
	}

	function handleMouseLeave() {
		onhover?.(null);
	}
</script>

{#snippet sortIcon(/** @type {string} */ column)}
	<span class="w-4 inline-flex justify-center">
		{#if sortBy === column}
			{#if sortOrder === 'asc'}
				<ChevronUp size={14} />
			{:else}
				<ChevronDown size={14} />
			{/if}
		{/if}
	</span>
{/snippet}

{#if facilities.length === 0}
	<p class="text-gray-500 italic p-4">No facilities found</p>
{:else}
	<!-- Sort Header (desktop only) - sticky -->
	<div class="hidden sm:block sticky top-0 z-10 bg-white border-b border-mid-warm-grey">
		<div class="grid grid-cols-12 items-center gap-2 pr-6">
			<button
				class="col-span-5 flex items-center gap-1 pl-6 pr-4 py-3 text-xs font-medium text-mid-grey hover:text-dark-grey transition-colors cursor-pointer text-left"
				onclick={() => handleSort('name')}
			>
				Facility
				{@render sortIcon('name')}
			</button>
			<div class="col-span-7 grid grid-cols-[auto_1fr_auto_auto] items-center gap-4">
				<button
					class="flex items-center gap-1 text-xs font-medium text-mid-grey hover:text-dark-grey transition-colors cursor-pointer"
					onclick={() => handleSort('region')}
				>
					Region
					{@render sortIcon('region')}
				</button>
				<div class="ml-3 text-xs font-medium text-mid-grey">Tech</div>
				<button
					class="flex items-center justify-end gap-1 text-xs font-medium text-mid-grey hover:text-dark-grey transition-colors cursor-pointer w-24"
					onclick={() => handleSort('storage')}
				>
					Storage
					{@render sortIcon('storage')}
				</button>
				<button
					class="flex items-center justify-end gap-1 text-xs font-medium text-mid-grey hover:text-dark-grey transition-colors cursor-pointer w-24"
					onclick={() => handleSort('capacity')}
				>
					<Tooltip
						text={CAPACITY_TOOLTIP.text}
						learnMoreHref={CAPACITY_TOOLTIP.learnMoreHref}
					>
						Capacity
					</Tooltip>
					{@render sortIcon('capacity')}
				</button>
			</div>
		</div>
	</div>

	<ul class="px-8 py-4 sm:px-0 sm:py-0 flex flex-col gap-6 sm:block">
		{#each sortedFacilities as facility (facility.code || facility.name)}
			<FacilityCard
				{facility}
				isHighlighted={hoveredFacility?.code === facility.code}
				isSelected={selectedFacilityCode === facility.code}
				onclick={(f) => onclick?.(f)}
				onmouseenter={handleMouseEnter}
				onmouseleave={handleMouseLeave}
			/>
		{/each}
	</ul>
{/if}
