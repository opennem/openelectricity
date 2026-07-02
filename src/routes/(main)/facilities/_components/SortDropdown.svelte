<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { ChevronUp, ChevronDown } from '@lucide/svelte';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import { getNextSort } from '../_utils/sort-facilities';

	/**
	 * Compact sort control for the mobile facilities sheet — the desktop list
	 * sorts via its column headers, which don't fit the sheet header. Selection
	 * behaviour is shared with those headers via getNextSort: a new field
	 * applies its natural default order, re-picking the current field flips it.
	 *
	 * @type {{
	 *   sortBy: 'name' | 'region' | 'storage' | 'capacity',
	 *   sortOrder: 'asc' | 'desc',
	 *   onsortchange?: (sortBy: 'name' | 'region' | 'storage' | 'capacity', sortOrder: 'asc' | 'desc') => void
	 * }}
	 */
	let { sortBy, sortOrder, onsortchange } = $props();

	let isOpen = $state(false);

	const FIELDS = /** @type {const} */ ([
		{ value: 'name', label: 'Name' },
		{ value: 'region', label: 'Region' },
		{ value: 'storage', label: 'Storage' },
		{ value: 'capacity', label: 'Capacity' }
	]);

	let currentLabel = $derived(FIELDS.find((f) => f.value === sortBy)?.label ?? 'Sort');

	/**
	 * @param {'name' | 'region' | 'storage' | 'capacity'} field
	 */
	function handleSelect(field) {
		const next = getNextSort(field, sortBy, sortOrder);
		onsortchange?.(next.sortBy, next.sortOrder);
		isOpen = false;
	}
</script>

<div class="relative" use:clickoutside onclickoutside={() => (isOpen = false)}>
	<button
		onclick={() => (isOpen = !isOpen)}
		class="bg-white rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-light-warm-grey transition-colors border border-warm-grey cursor-pointer"
		title="Sort facilities"
	>
		<span>{currentLabel}</span>
		<IconChevronUpDown class="size-3.5 text-mid-grey" />
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-mid-warm-grey z-50 min-w-[140px] py-1"
			in:fly={{ y: -5, duration: 150 }}
		>
			{#each FIELDS as { value, label } (value)}
				<button
					onclick={() => handleSelect(value)}
					class="w-full px-3 py-2 text-xs flex items-center justify-between gap-3 hover:bg-light-warm-grey transition-colors text-left cursor-pointer"
					class:font-medium={sortBy === value}
					class:text-dark-grey={sortBy === value}
					class:text-mid-grey={sortBy !== value}
				>
					<span>{label}</span>
					{#if sortBy === value}
						{#if sortOrder === 'asc'}
							<ChevronUp size={14} />
						{:else}
							<ChevronDown size={14} />
						{/if}
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
