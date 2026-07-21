<script>
	import FuelTechBadgeStack from '$lib/components/FuelTechBadgeStack.svelte';
	import UnitGroupPopup from './UnitGroupPopup.svelte';
	import { fuelTechNameMap } from '$lib/fuel_techs.js';
	import { getRegionLabel } from '$lib/facilities/filters.js';
	import formatValue from '../_utils/format-value';
	import { groupUnits, getOrderedFuelTechGroups } from '$lib/facilities/units.js';
	import { nameColumnClass, metaColumnsClass } from '../_utils/list-columns.js';

	/**
	 * `dense` renders the mobile-sheet row: fuel-tech icons on the left, name
	 * with a "Tech · Region" subtitle, capacity (and storage) on the right.
	 * Skips the unit-group hover popup, which doesn't suit touch.
	 *
	 * `narrow` is the selected-state list treatment: the list shrinks beside the
	 * detail panel, so the row drops the storage/capacity and region columns and
	 * overlaps the fuel-tech badges.
	 * @type {{
	 *   facility: any,
	 *   isHighlighted?: boolean,
	 *   isSelected?: boolean,
	 *   compact?: boolean,
	 *   dense?: boolean,
	 *   narrow?: boolean,
	 *   darkMode?: boolean,
	 *   isFullscreen?: boolean,
	 *   metricValue?: number | null,
	 *   metricUnit?: string | null,
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
		dense = false,
		narrow = false,
		darkMode = false,
		isFullscreen = false,
		metricValue = null,
		metricUnit = null,
		onclick,
		onmouseenter,
		onmouseleave
	} = $props();

	let showMetric = $derived(metricValue != null && metricUnit != null);

	let unitGroups = $derived(groupUnits(facility));
	// Ordered + de-duplicated fuel techs for the overlapping badge row — shares
	// the detail panel's ordering so list and detail icons always match.
	let orderedFuelTechs = $derived(getOrderedFuelTechGroups(facility));
	let totalCapacity = $derived(unitGroups.reduce((sum, g) => sum + g.totalCapacity, 0));
	let totalStorage = $derived(unitGroups.reduce((sum, g) => sum + (g.capacity_storage || 0), 0));
	let primaryGroup = $derived(unitGroups[0]);
	let hasCommittedUnit = $derived(unitGroups.some((g) => g.status_id === 'committed'));

	// Data for UnitGroupPopup
	let popupUnits = $derived(
		unitGroups.map((g) => ({
			fueltech_id: g.fueltech_id,
			status_id: g.status_id,
			isCommissioning: g.isCommissioning,
			capacity: g.totalCapacity,
			capacity_storage: g.capacity_storage,
			max_generation: g.max_generation,
			bgColor: g.bgColor
		}))
	);

	/** @type {'sm' | 'md' | 'lg'} */
	let badgeSize = $derived(compact ? 'sm' : 'lg');

	// Standard list badges spread out while there are at most two; rows with
	// more fuel techs overlap them, as do the space-constrained cluster popup,
	// dense sheet rows and the narrowed selected-state list.
	let badgesOverlap = $derived(compact || dense || narrow || orderedFuelTechs.length > 2);

	// Dense subtitle: the leading (dominant) fuel tech's base name + short
	// region, e.g. "Coal · NSW" (coal_black → Coal, solar_utility → Solar) —
	// mirrors the icon the badge stack shows first. The base name comes from
	// the canonical fuelTechNameMap so it can't drift from other surfaces.
	let denseSubtitle = $derived.by(() => {
		const id = /** @type {string} */ (orderedFuelTechs[0]?.fueltech_id ?? '');
		const base = id.split('_')[0];
		return [
			fuelTechNameMap[base] ?? base,
			getRegionLabel(facility.network_id, facility.network_region)
		]
			.filter(Boolean)
			.join(' · ');
	});
</script>

{#snippet badgeGroup()}
	<FuelTechBadgeStack
		groups={orderedFuelTechs}
		size={badgeSize}
		{darkMode}
		overlap={badgesOverlap}
	/>
{/snippet}

{#snippet metricCell()}
	<div class="flex flex-col items-end gap-0.5 shrink-0">
		<div class="flex justify-end items-baseline gap-1">
			{#if showMetric}
				<span class="font-mono text-sm text-dark-grey">
					{formatValue(/** @type {number} */ (metricValue))}
				</span>
				<span class="text-xs text-mid-grey">{metricUnit}</span>
			{:else}
				<span class="font-mono text-sm text-dark-grey" title="Total Capacity">
					{formatValue(totalCapacity)}
				</span>
				<span class="text-xs text-mid-grey">MW</span>
			{/if}
		</div>

		<!-- Dense rows have no storage column, so stack it under the capacity. -->
		{#if !showMetric && totalStorage > 0}
			<div class="flex justify-end items-baseline gap-1" title="Storage Capacity">
				<span class="font-mono text-xxs text-dark-grey">{formatValue(totalStorage)}</span>
				<span class="text-xxs text-mid-grey">MWh</span>
			</div>
		{/if}
	</div>
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
			<div class="shrink-0">
				{@render badgeGroup()}
			</div>

			<!-- Active "Show by" metric (or capacity by default), aligned right -->
			<div class="flex-1 flex justify-end items-baseline gap-1">
				{#if showMetric}
					<span class="font-mono text-sm {darkMode ? 'text-white' : 'text-dark-grey'}">
						{formatValue(/** @type {number} */ (metricValue))}
					</span>
					<span class="text-xs {darkMode ? 'text-white/60' : 'text-mid-grey'}">{metricUnit}</span>
				{:else}
					<span class="font-mono text-sm {darkMode ? 'text-white' : 'text-dark-grey'}">
						{formatValue(totalCapacity)}
					</span>
					<span class="text-xs {darkMode ? 'text-white/60' : 'text-mid-grey'}">MW</span>
					{#if totalStorage > 0}
						<span class="text-xs {darkMode ? 'text-white/40' : 'text-mid-warm-grey'}">/</span>
						<span class="font-mono text-sm {darkMode ? 'text-white' : 'text-dark-grey'}">
							{formatValue(totalStorage)}
						</span>
						<span class="text-xs {darkMode ? 'text-white/60' : 'text-mid-grey'}">MWh</span>
					{/if}
				{/if}
			</div>
		</div>
	</button>
{:else if dense}
	<!-- Dense mode for the mobile facilities sheet: icons | name + subtitle | capacity -->
	<li
		class="border-b border-warm-grey last:border-b-0"
		data-facility-code={facility.code}
		onmouseenter={() => onmouseenter?.(facility)}
		onmouseleave={() => onmouseleave?.()}
	>
		<button
			class="w-full text-left flex items-center gap-3 px-4 py-3 group relative hover:bg-warm-grey cursor-pointer {isSelected
				? 'ring-1 ring-mid-grey ring-inset'
				: ''}"
			class:bg-light-warm-grey={hasCommittedUnit && !isHighlighted && !isSelected}
			class:bg-warm-grey={isHighlighted || isSelected}
			onclick={() => onclick?.(facility)}
		>
			<span class="inline-flex shrink-0">
				{@render badgeGroup()}
			</span>

			<div class="min-w-0 flex-1">
				<div class="text-sm font-semibold text-dark-grey truncate">
					{facility.name || 'Unnamed Facility'}
				</div>
				<div class="text-xs text-mid-grey truncate mt-0.5">
					{denseSubtitle}
				</div>
			</div>

			{@render metricCell()}
		</button>
	</li>
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
			<div
				class="pl-4 sm:pl-6 pr-4 py-3 sm:py-4 pb-2 sm:pb-4 @container col-span-12 min-w-0 {nameColumnClass(
					narrow
				)}"
			>
				<div
					class="{isFullscreen
						? 'text-xs tablet:text-sm'
						: 'text-sm tablet:text-base'} leading-snug tablet:leading-base font-medium text-dark-grey truncate"
				>
					{facility.name || 'Unnamed Facility'}
				</div>
			</div>

			<div
				class="col-span-12 grid grid-cols-[2fr_1fr_1fr] items-center gap-4 px-4 sm:px-0 py-2 sm:py-0 border-t sm:border-t-0 {metaColumnsClass(
					narrow
				)}"
				class:border-mid-warm-grey={isHighlighted || isSelected}
				class:border-warm-grey={!isHighlighted && !isSelected}
			>
				{#if !narrow}
					<div
						class="text-xxs tablet:text-xs text-mid-grey col-start-2 sm:col-start-auto flex justify-end sm:justify-start"
					>
						<span
							class="block w-14 tablet:w-18 border-r pr-4 tablet:pr-6 text-right group-hover:border-light-warm-grey"
							class:border-mid-warm-grey={isHighlighted || isSelected}
							class:border-warm-grey={!isHighlighted && !isSelected}
						>
							{getRegionLabel(facility.network_id, facility.network_region)}
						</span>
					</div>
				{/if}

				<div
					class="col-start-1 row-start-1 sm:col-start-auto sm:row-start-auto sm:ml-3 flex items-center"
				>
					<span class="inline-flex shrink-0">
						{@render badgeGroup()}
					</span>
				</div>

				{#if !narrow}
					<div class="hidden sm:flex w-24 justify-end items-baseline gap-1 mr-4">
						{#if totalStorage > 0}
							<span
								class="font-mono text-xxs tablet:text-xs text-dark-grey"
								title="Storage Capacity"
							>
								{formatValue(totalStorage)}
							</span>
							<span class="text-xxs text-mid-grey">MWh</span>
						{/if}
					</div>

					<div class="flex justify-end items-center gap-2 group col-start-3 sm:col-start-auto w-24">
						<div class="flex justify-end items-baseline gap-1">
							{#if showMetric}
								<span class="font-mono text-xs tablet:text-sm text-dark-grey">
									{formatValue(/** @type {number} */ (metricValue))}
								</span>
								<span class="text-xxs tablet:text-xs text-mid-grey">{metricUnit}</span>
							{:else}
								<span
									class="font-mono text-xs tablet:text-sm text-dark-grey"
									title="Total Capacity"
								>
									{formatValue(totalCapacity)}
								</span>
								<span class="text-xxs tablet:text-xs text-mid-grey">MW</span>
							{/if}
						</div>

						{#if primaryGroup}
							<UnitGroupPopup units={popupUnits} network_id={facility.network_id} />
						{/if}
					</div>
				{/if}
			</div>
		</button>
	</li>
{/if}
