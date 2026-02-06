<script>
	import FuelTechBadge from './FuelTechBadge.svelte';
	import UnitGroupPopup from './UnitGroupPopup.svelte';
	import { getRegionLabel } from '../_utils/filters';
	import formatValue from '../_utils/format-value';
	import { groupUnits } from '../_utils/units';

	/**
	 * @type {{
	 *   facility: any,
	 *   isHighlighted?: boolean,
	 *   isSelected?: boolean,
	 *   compact?: boolean,
	 *   darkMode?: boolean,
	 *   onclick?: (facility: any) => void,
	 *   onmouseenter?: (facility: any) => void,
	 *   onmouseleave?: () => void
	 * }}
	 */
	let {
		facility,
		isHighlighted = false,
		isSelected = false,
		compact = false,
		darkMode = false,
		onclick,
		onmouseenter,
		onmouseleave
	} = $props();

	let unitGroups = $derived(groupUnits(facility));
	let totalCapacity = $derived(unitGroups.reduce((sum, g) => sum + g.totalCapacity, 0));
	let hasMultipleGroups = $derived(unitGroups.length > 1);
	let primaryGroup = $derived(unitGroups[0]);
	let hasCommittedUnit = $derived(unitGroups.some((g) => g.status_id === 'committed'));

	// Data for UnitGroupPopup
	let popupUnits = $derived(
		unitGroups.map((g) => ({
			fueltech_id: g.fueltech_id,
			status_id: g.status_id,
			isCommissioning: g.isCommissioning,
			capacity_maximum: g.capacity_maximum,
			capacity_registered: g.capacity_registered,
			max_generation: g.max_generation,
			bgColor: g.bgColor
		}))
	);

	/** @type {'sm' | 'md'} */
	let badgeSize = $derived(compact ? 'sm' : 'md');
</script>

{#snippet badgeGroup()}
	{#if hasMultipleGroups}
		<span class="flex">
			{#each unitGroups as group, i (`${group.fueltech_id}-${group.status_id}`)}
				<FuelTechBadge
					fueltech_id={group.fueltech_id}
					status_id={group.status_id}
					isCommissioning={group.isCommissioning}
					size={badgeSize}
					{darkMode}
					overlap={i > 0}
					zIndex={i + 1}
				/>
			{/each}
		</span>
	{:else if primaryGroup}
		<span>
			<FuelTechBadge
				fueltech_id={primaryGroup.fueltech_id}
				status_id={primaryGroup.status_id}
				isCommissioning={primaryGroup.isCommissioning}
				size={badgeSize}
				{darkMode}
			/>
		</span>
	{/if}
{/snippet}

{#if compact}
	<!-- Compact mode for cluster popup -->
	<button
		class="w-full px-4 py-3 text-left transition-colors border-b last:border-b-0 {darkMode
			? 'hover:bg-white/10 border-white/20'
			: 'hover:bg-light-warm-grey border-warm-grey'}"
		onclick={() => onclick?.(facility)}
		onmouseenter={() => onmouseenter?.(facility)}
		onmouseleave={() => onmouseleave?.()}
	>
		<!-- Row 1: Facility name -->
		<div class="font-medium text-sm truncate {darkMode ? 'text-white' : 'text-dark-grey'}">
			{facility.name || 'Unnamed Facility'}
		</div>

		<!-- Row 2: Region | Fuel tech badges | Capacity -->
		<div class="flex items-center gap-2 mt-1">
			<!-- Region -->
			<span class="text-xs {darkMode ? 'text-white/60' : 'text-mid-grey'}">
				{getRegionLabel(facility.network_id, facility.network_region)}
			</span>

			<!-- Separator -->
			<span class="text-xs {darkMode ? 'text-white/30' : 'text-warm-grey'}">|</span>

			<!-- Fuel tech badges with fan out -->
			<div class="flex-shrink-0">
				{@render badgeGroup()}
			</div>

			<!-- Capacity (aligned right) -->
			<div class="flex-1 flex justify-end items-baseline gap-1">
				<span class="font-mono text-sm {darkMode ? 'text-white' : 'text-dark-grey'}">
					{formatValue(totalCapacity)}
				</span>
				<span class="text-xs {darkMode ? 'text-white/60' : 'text-mid-grey'}">MW</span>
			</div>
		</div>
	</button>
{:else}
	<!-- Standard mode -->
	<li
		class="@container border border-warm-grey rounded-lg mb-2 sm:border-0 sm:border-b sm:rounded-none sm:mb-0 last:mb-0 last:sm:border-b-0"
		data-facility-code={facility.code}
		onmouseenter={() => onmouseenter?.(facility)}
		onmouseleave={() => onmouseleave?.()}
	>
		<button
			class="w-full text-left grid grid-cols-12 items-center gap-2 sm:pr-6 group relative hover:bg-warm-grey cursor-pointer {isSelected
				? 'ring-1 ring-mid-grey ring-inset'
				: 'rounded-lg sm:rounded-sm'}"
			class:bg-light-warm-grey={hasCommittedUnit && !isHighlighted && !isSelected}
			class:bg-warm-grey={isHighlighted || isSelected}
			onclick={() => onclick?.(facility)}
		>
			<div class="pl-6 pr-4 py-4 pb-2 sm:pb-4 @container col-span-12 sm:col-span-5">
				<div class="text-base leading-base font-medium text-dark-grey">
					{facility.name || 'Unnamed Facility'}
				</div>
			</div>

			<div
				class="col-span-12 sm:col-span-7 grid grid-cols-[2fr_1fr_1fr] sm:flex items-center gap-4 px-4 sm:px-0 py-2 sm:py-0 border-t sm:border-t-0"
				class:border-mid-warm-grey={isHighlighted || isSelected}
				class:border-warm-grey={!isHighlighted && !isSelected}
			>
				<div
					class="text-xs text-mid-grey col-start-2 sm:col-auto flex justify-end sm:justify-start"
				>
					<span
						class="block w-18 border-r pr-6 text-right group-hover:border-light-warm-grey"
						class:border-mid-warm-grey={isHighlighted || isSelected}
						class:border-warm-grey={!isHighlighted && !isSelected}
					>
						{getRegionLabel(facility.network_id, facility.network_region)}
					</span>
				</div>

				<div class="col-start-1 row-start-1 sm:col-auto sm:row-auto sm:ml-3 flex items-center">
					<span class="inline-flex flex-shrink-0">
						{@render badgeGroup()}
					</span>
				</div>

				<div class="sm:flex-1 flex justify-end items-center gap-2 group col-start-3 sm:col-auto">
					<div class="flex justify-end items-baseline gap-2">
						<span class="font-mono text-sm text-dark-grey" title="Total Capacity">
							{formatValue(totalCapacity)}
						</span>
						<span class="text-xs text-mid-grey">MW</span>
					</div>

					{#if primaryGroup}
						<UnitGroupPopup units={popupUnits} network_id={facility.network_id} />
					{/if}
				</div>
			</div>
		</button>
	</li>
{/if}
