<script>
	import { tick } from 'svelte';
	import { ChevronUp, ChevronDown } from '@lucide/svelte';
	import FacilityCard from './_components/FacilityCard.svelte';
	import { scrollToFacilityIfNeeded } from './_utils/scroll-utils';
	import { getRegionLabel } from './_utils/filters';

	/**
	 * @type {{
	 *   facilities: any[],
	 *   hoveredFacility?: any | null,
	 *   clickedFacility?: any | null,
	 *   selectedFacilityCode?: string | null,
	 *   sortBy?: 'name' | 'region' | 'capacity',
	 *   sortOrder?: 'asc' | 'desc',
	 *   onhover?: (facility: any | null) => void,
	 *   onclick?: (facility: any) => void,
	 *   onsortchange?: (sortBy: 'name' | 'region' | 'capacity', sortOrder: 'asc' | 'desc') => void
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

	/**
	 * Get total capacity for a facility
	 * @param {any} facility
	 * @returns {number}
	 */
	function getTotalCapacity(facility) {
		if (!facility.units) return 0;
		return facility.units.reduce((/** @type {number} */ sum, /** @type {any} */ unit) => {
			return sum + (Number(unit.capacity_maximum) || Number(unit.capacity_registered) || 0);
		}, 0);
	}

	/**
	 * Get region label for sorting
	 * @param {any} facility
	 * @returns {string}
	 */
	function getRegion(facility) {
		return getRegionLabel(facility.network_id, facility.network_region);
	}

	// Sorted facilities
	let sortedFacilities = $derived.by(() => {
		const sorted = [...facilities];
		sorted.sort((a, b) => {
			let comparison = 0;
			switch (sortBy) {
				case 'name':
					comparison = (a.name || '').localeCompare(b.name || '');
					break;
				case 'region':
					comparison = getRegion(a).localeCompare(getRegion(b));
					break;
				case 'capacity':
					comparison = getTotalCapacity(a) - getTotalCapacity(b);
					break;
			}
			return sortOrder === 'asc' ? comparison : -comparison;
		});
		return sorted;
	});

	/**
	 * Handle sort column click
	 * @param {'name' | 'region' | 'capacity'} column
	 */
	function handleSort(column) {
		/** @type {'asc' | 'desc'} */
		let newOrder;
		/** @type {'name' | 'region' | 'capacity'} */
		let newSortBy = column;

		if (sortBy === column) {
			newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			newOrder = column === 'capacity' ? 'desc' : 'asc';
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
	<div class="hidden sm:block sticky top-0 z-10 bg-white border-b border-warm-grey">
		<div class="grid grid-cols-12 items-center gap-2 pr-6">
			<button
				class="col-span-5 flex items-center gap-1 pl-6 pr-4 py-3 text-xs font-medium text-mid-grey hover:text-dark-grey transition-colors cursor-pointer text-left"
				onclick={() => handleSort('name')}
			>
				Facility
				{@render sortIcon('name')}
			</button>
			<div class="col-span-7 flex items-center gap-4">
				<button
					class="flex items-center gap-1 text-xs font-medium text-mid-grey hover:text-dark-grey transition-colors cursor-pointer"
					onclick={() => handleSort('region')}
				>
					Region
					{@render sortIcon('region')}
				</button>
				<div class="ml-3 text-xs font-medium text-mid-grey">Tech</div>
				<button
					class="flex-1 flex items-center justify-end gap-1 text-xs font-medium text-mid-grey hover:text-dark-grey transition-colors cursor-pointer"
					onclick={() => handleSort('capacity')}
				>
					Capacity
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
