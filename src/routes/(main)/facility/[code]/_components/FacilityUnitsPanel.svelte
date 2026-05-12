<script>
	import { LayoutList, Grid2x2 } from '@lucide/svelte';
	import { FacilityUnitsTable } from '$lib/components/charts/facility';
	import FacilityUnitCards from './FacilityUnitCards.svelte';

	/**
	 * @type {{
	 *   facility?: any | null
	 * }}
	 */
	let { facility = null } = $props();

	let units = $derived(facility?.units ?? []);
	let hasUnits = $derived(units.length > 0);

	/** @type {'table' | 'card'} */
	let viewMode = $state('card');
</script>

{#if hasUnits}
	<div>
		<div class="flex items-center justify-between mb-4">
			<h4 class="text-xs uppercase text-mid-grey m-0">
				{units.length}
				{units.length === 1 ? 'Unit' : 'Units'}
			</h4>
			<div class="flex items-center gap-0.5 bg-light-warm-grey rounded-md p-0.5">
				<button
					class="p-1.5 rounded transition-colors cursor-pointer {viewMode === 'table'
						? 'bg-white shadow-sm text-dark-grey'
						: 'text-mid-grey hover:text-dark-grey'}"
					onclick={() => (viewMode = 'table')}
					aria-label="Table view"
				>
					<LayoutList size={14} />
				</button>
				<button
					class="p-1.5 rounded transition-colors cursor-pointer {viewMode === 'card'
						? 'bg-white shadow-sm text-dark-grey'
						: 'text-mid-grey hover:text-dark-grey'}"
					onclick={() => (viewMode = 'card')}
					aria-label="Card view"
				>
					<Grid2x2 size={14} />
				</button>
			</div>
		</div>

		{#if viewMode === 'table'}
			<FacilityUnitsTable {units} compact detailed />
		{:else}
			<FacilityUnitCards {facility} />
		{/if}
	</div>
{/if}
