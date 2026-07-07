<script>
	import { tick } from 'svelte';
	import { ChevronUp, ChevronDown } from '@lucide/svelte';
	import FacilityCard from './_components/FacilityCard.svelte';
	import { scrollToFacilityIfNeeded } from './_utils/scroll-utils';
	import { sortFacilities, getNextSort } from './_utils/sort-facilities';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { CAPACITY_TOOLTIP } from './_utils/capacity-tooltip.js';

	/**
	 * `dense` forces the desktop row layout (dividers, columns) at mobile
	 * widths — used by the mobile facilities sheet, whose narrow rows would
	 * otherwise render as the chunky small-viewport cards.
	 * @type {{
	 *   facilities: any[],
	 *   hoveredFacility?: any | null,
	 *   clickedFacility?: any | null,
	 *   selectedFacilityCode?: string | null,
	 *   compact?: boolean,
	 *   dense?: boolean,
	 *   sortBy?: 'name' | 'region' | 'storage' | 'capacity',
	 *   sortOrder?: 'asc' | 'desc',
	 *   isFullscreen?: boolean,
	 *   metricMeta?: { label: string, shortLabel: string, unit: string },
	 *   metricActive?: boolean,
	 *   metricValuesRaw?: Map<string, number>,
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
		compact = false,
		dense = false,
		sortBy = 'name',
		sortOrder = 'asc',
		isFullscreen = false,
		metricMeta = { label: 'Capacity', shortLabel: 'Capacity', unit: 'MW' },
		metricActive = false,
		metricValuesRaw = new Map(),
		onhover,
		onclick,
		onsortchange
	} = $props();

	// When a non-capacity metric is active, the rightmost column sorts by the
	// raw metric value rather than by registered capacity (MW).
	let sortedFacilities = $derived(
		sortFacilities(facilities, sortBy, sortOrder, metricActive ? metricValuesRaw : null)
	);

	/**
	 * Handle sort column click
	 * @param {'name' | 'region' | 'storage' | 'capacity'} column
	 */
	function handleSort(column) {
		const next = getNextSort(column, sortBy, sortOrder);
		onsortchange?.(next.sortBy, next.sortOrder);
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
	{#if sortBy === column}
		<span class="w-4 inline-flex justify-center">
			{#if sortOrder === 'asc'}
				<ChevronUp size={14} />
			{:else}
				<ChevronDown size={14} />
			{/if}
		</span>
	{/if}
{/snippet}

{#if facilities.length === 0}
	<p class="text-gray-500 italic p-4">No facilities found</p>
{:else}
	<!-- Sort Header (desktop only; the dense sheet list sorts via its own
	     dropdown) - sticky -->
	{#if !dense}
		<div class="hidden sm:block sticky top-0 z-10 bg-white border-b border-mid-warm-grey">
			<div class="grid grid-cols-12 items-center gap-2 pr-6">
				<button
					class="col-span-5 flex items-center gap-1 pl-6 pr-4 py-3 text-xs font-medium text-mid-grey hover:text-dark-grey transition-colors cursor-pointer text-left"
					onclick={() => handleSort('name')}
				>
					Facility
					{@render sortIcon('name')}
				</button>
				<div
					class="col-span-7 grid items-center gap-4 {compact
						? 'grid-cols-[auto_1fr]'
						: 'grid-cols-[auto_1fr_auto_auto]'}"
				>
					<button
						class="flex items-center gap-1 text-xs font-medium text-mid-grey hover:text-dark-grey transition-colors cursor-pointer"
						onclick={() => handleSort('region')}
					>
						Region
						{@render sortIcon('region')}
					</button>
					<div class="ml-3 text-xs font-medium text-mid-grey">Tech</div>
					{#if !compact}
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
							{#if metricActive}
								{metricMeta.shortLabel}
							{:else}
								<Tooltip
									text={CAPACITY_TOOLTIP.text}
									learnMoreHref={CAPACITY_TOOLTIP.learnMoreHref}
								>
									Capacity
								</Tooltip>
							{/if}
							{@render sortIcon('capacity')}
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<ul class={dense ? '' : 'px-8 py-4 sm:px-0 sm:py-0 flex flex-col gap-6 sm:block'}>
		{#each sortedFacilities as facility (facility.code || facility.name)}
			<FacilityCard
				{facility}
				isHighlighted={hoveredFacility?.code === facility.code}
				isSelected={selectedFacilityCode === facility.code}
				hideMetricCols={compact}
				{dense}
				{isFullscreen}
				metricValue={metricActive ? (metricValuesRaw.get(facility.code) ?? null) : null}
				metricUnit={metricActive ? metricMeta.unit : null}
				onclick={(f) => onclick?.(f)}
				onmouseenter={handleMouseEnter}
				onmouseleave={handleMouseLeave}
			/>
		{/each}
	</ul>
{/if}
