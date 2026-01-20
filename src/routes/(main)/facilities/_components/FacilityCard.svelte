<script>
	import FuelTechBadge from './FuelTechBadge.svelte';
	import OverflowBadge from './OverflowBadge.svelte';
	import UnitGroupPopup from './UnitGroupPopup.svelte';
	import { getRegionLabel } from '../_utils/filters';
	import formatValue from '../_utils/format-value';
	import { getFueltechColor } from '../_utils/fueltech-display';
	import { ExternalLink } from '@lucide/svelte';

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

	/**
	 * Sum a numeric field across units
	 * @param {any[]} units
	 * @param {string} field
	 * @returns {number}
	 */
	function sumField(units, field) {
		return units.reduce((sum, unit) => sum + (Number(unit[field]) || 0), 0);
	}

	/**
	 * @typedef {Object} UnitSummary
	 * @property {string} fueltech_id
	 * @property {string} status_id
	 * @property {number} capacity_maximum
	 * @property {number} capacity_registered
	 * @property {number} max_generation
	 */

	/**
	 * @typedef {Object} UnitGroupType
	 * @property {string} fueltech_id
	 * @property {string} status_id
	 * @property {any[]} units
	 * @property {boolean} isCommissioning
	 * @property {number} totalCapacity
	 * @property {string} bgColor
	 * @property {UnitSummary} unitSummary
	 */

	/**
	 * Group units by fueltech_id and status_id
	 * @returns {UnitGroupType[]}
	 */
	function groupUnits() {
		if (!facility.units || facility.units.length === 0) return [];

		/** @type {Map<string, {fueltech_id: string, status_id: string, units: any[]}>} */
		const groups = new Map();

		for (const unit of facility.units) {
			const key = `${unit.fueltech_id}|||${unit.status_id}`;

			if (!groups.has(key)) {
				groups.set(key, {
					fueltech_id: unit.fueltech_id,
					status_id: unit.status_id,
					units: []
				});
			}
			groups.get(key)?.units.push({ ...unit, isCommissioning: unit.isCommissioning });
		}

		return Array.from(groups.values()).map((group) => {
			const capacity_maximum = sumField(group.units, 'capacity_maximum');
			const capacity_registered = sumField(group.units, 'capacity_registered');
			const max_generation = sumField(group.units, 'max_generation');

			return {
				fueltech_id: group.fueltech_id,
				status_id: group.status_id,
				units: group.units,
				isCommissioning: group.units.some((unit) => unit.isCommissioning),
				totalCapacity: capacity_maximum || capacity_registered,
				bgColor: getFueltechColor(group.fueltech_id),
				unitSummary: {
					fueltech_id: group.fueltech_id,
					status_id: group.status_id,
					capacity_maximum,
					capacity_registered,
					max_generation
				}
			};
		});
	}

	let unitGroups = $derived(groupUnits());
	let totalCapacity = $derived(unitGroups.reduce((sum, g) => sum + g.totalCapacity, 0));
	let hasMultipleGroups = $derived(unitGroups.length > 1);
	let primaryGroup = $derived(unitGroups[0]);
	let hasCommittedUnit = $derived(unitGroups.some((g) => g.status_id === 'committed'));

	// For display: show max 3 icons, then +N for overflow (but only if N >= 2)
	const MAX_VISIBLE_ICONS = 3;
	// Don't show "+1", just show the 4th icon instead
	let effectiveMaxVisible = $derived(
		unitGroups.length === MAX_VISIBLE_ICONS + 1 ? unitGroups.length : MAX_VISIBLE_ICONS
	);
	let visibleGroups = $derived(unitGroups.slice(0, effectiveMaxVisible));
	let overflowCount = $derived(Math.max(0, unitGroups.length - effectiveMaxVisible));
	let hasOverflow = $derived(overflowCount > 0);
	let hiddenGroups = $derived(unitGroups.slice(effectiveMaxVisible));

	// Data for UnitGroupPopup
	let popupUnits = $derived(
		unitGroups.map((g) => ({
			fueltech_id: g.unitSummary.fueltech_id,
			status_id: g.unitSummary.status_id,
			isCommissioning: g.isCommissioning,
			capacity_maximum: g.unitSummary.capacity_maximum,
			capacity_registered: g.unitSummary.capacity_registered,
			max_generation: g.unitSummary.max_generation,
			bgColor: g.bgColor
		}))
	);

	let path = $derived(
		`https://explore.openelectricity.org.au/facility/au/${facility.network_id}/${facility.code}/`
	);

	/** @type {'sm' | 'md'} */
	let badgeSize = $derived(compact ? 'sm' : 'md');
</script>

{#snippet badgeGroup()}
	{#if hasMultipleGroups}
		<span class="flex group/badges">
			{#each visibleGroups as group, i (group.fueltech_id)}
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
			{#if hasOverflow}
				<OverflowBadge
					count={overflowCount}
					size={badgeSize}
					{darkMode}
					zIndex={visibleGroups.length + 1}
				/>
			{/if}
			{#each hiddenGroups as group, i (group.fueltech_id)}
				<FuelTechBadge
					fueltech_id={group.fueltech_id}
					status_id={group.status_id}
					isCommissioning={group.isCommissioning}
					size={badgeSize}
					{darkMode}
					hidden={true}
					zIndex={effectiveMaxVisible + i + 1}
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
			class="w-full text-left grid grid-cols-12 items-center gap-2 sm:pr-6 group relative hover:bg-warm-grey rounded-lg sm:rounded-sm cursor-pointer {isSelected
				? 'ring-1 ring-mid-warm-grey ring-inset'
				: ''}"
			class:bg-light-warm-grey={hasCommittedUnit && !isHighlighted && !isSelected}
			class:bg-warm-grey={isHighlighted || isSelected}
			onclick={() => onclick?.(facility)}
		>
			<div class="pl-6 pr-4 py-4 pb-2 sm:pb-4 @container col-span-12 sm:col-span-5">
				<div class="text-base leading-base font-medium text-dark-grey flex items-center gap-2">
					{facility.name || 'Unnamed Facility'}
					<a
						href={path}
						target="_blank"
						rel="noopener noreferrer"
						class="text-mid-grey hover:text-dark-grey transition-colors self-center opacity-0 group-hover:opacity-100 {isSelected
							? 'opacity-100'
							: ''}"
						title="View facility details"
						aria-label="View facility details (opens in new tab)"
						onclick={(e) => e.stopPropagation()}
					>
						<ExternalLink size={16} />
					</a>
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

				<div class="col-start-1 row-start-1 sm:col-auto sm:row-auto sm:ml-3">
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
