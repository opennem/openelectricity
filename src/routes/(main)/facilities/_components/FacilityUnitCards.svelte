<script>
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import GenCapViz from '$lib/components/facilities/GenCapViz.svelte';
	import { fuelTechName } from '$lib/fuel_techs';
	import { groupUnits } from '$lib/facilities/units.js';
	import formatValue from '../_utils/format-value';
	import { getPercentage, getParsedDate, formatTimestampLabel } from '../_utils/unit-helpers';
	import { sortByDetailedOrder } from '$lib/fuel-tech-groups/detailed';

	/**
	 * `singleColumn` forces one card per row (used in the narrow 1/3-width units
	 * column of the /facilities detail pane); otherwise the grid is two-up on wider
	 * viewports (e.g. the standalone /facility/[code] sidebar).
	 * @type {{ facility: any, singleColumn?: boolean }}
	 */
	let { facility, singleColumn = false } = $props();

	// Top-of-stack first, matching the facility header + chart paint order.
	let unitGroups = $derived(
		facility
			? sortByDetailedOrder(groupUnits(facility, { skipBattery: true }), { reverse: true })
			: []
	);
	let offset = $derived(facility?.network_id === 'WEM' ? '+08:00' : '+10:00');
</script>

<div class="grid grid-cols-1 gap-3 {singleColumn ? '' : 'min-[420px]:grid-cols-2'}">
	{#each unitGroups as group (group.fueltech_id + '|||' + group.status_id)}
		{@const capacity = group.totalCapacity}
		{@const firstUnit = group.units[0]}

		<div class="rounded-lg border border-warm-grey bg-white px-3 py-3 relative">
			<!-- Status dot -->
			<div class="absolute top-3 right-3">
				<Tooltip text={group.status_id} class="capitalize cursor-default">
					<FacilityStatusIcon
						status={group.status_id}
						isCommissioning={group.isCommissioning}
						size="lg"
					/>
				</Tooltip>
			</div>

			<!-- Badge + name -->
			<div class="flex items-center gap-2 min-w-0 text-xs pr-6">
				<FuelTechBadge fuelTech={group.fueltech_id} size="lg" />
				<div class="min-w-0 leading-tight {group.units.length > 1 ? 'pt-1' : ''}">
					<span class="font-medium text-dark-grey truncate block">
						{fuelTechName(/** @type {FuelTechCode} */ (group.fueltech_id))}
					</span>
					{#if group.units.length > 1}
						<span class="text-xxs text-mid-grey">{group.units.length} units</span>
					{/if}
				</div>
			</div>

			<!-- Stats -->
			<div class="grid grid-cols-2 gap-3 mt-3">
				<!-- Capacity -->
				<div>
					<div class="font-mono font-semibold text-lg text-dark-grey leading-tight">
						{#if group.max_generation && group.isCommissioning}
							{formatValue(group.max_generation)}<span class="text-mid-grey font-normal">/</span
							>{/if}{formatValue(capacity)}<span class="text-xs font-normal text-mid-grey ml-0.5"
							>MW</span
						>
					</div>
					<div class="text-xxs text-mid-grey">Capacity</div>
				</div>

				<!-- Storage -->
				{#if group.capacity_storage > 0}
					<div>
						<div class="font-mono font-semibold text-lg text-dark-grey leading-tight">
							{formatValue(group.capacity_storage)}<span
								class="text-xs font-normal text-mid-grey ml-0.5">MWh</span
							>
						</div>
						<div class="text-xxs text-mid-grey">Storage</div>
					</div>
				{/if}
			</div>

			<!-- Commissioning progress -->
			{#if group.isCommissioning}
				<div class="mt-3">
					<GenCapViz {capacity} maxGeneration={group.max_generation} fill={group.bgColor} />
					{#if group.max_generation}
						<div class="text-xxs text-mid-grey mt-1">
							{getPercentage(group.max_generation, capacity)}%
						</div>
					{/if}
				</div>
			{/if}

			<!-- Temporal data (only for single-unit groups) -->
			{#if group.units.length === 1 && (firstUnit?.max_generation_interval || firstUnit?.data_first_seen || firstUnit?.data_last_seen)}
				<div class="mt-2 space-y-0.5">
					{#if firstUnit.max_generation_interval && group.isCommissioning}
						<div class="text-xxs text-mid-grey">
							Max generated at {formatTimestampLabel(
								getParsedDate(firstUnit.max_generation_interval, offset)
							)}
						</div>
					{/if}

					{#if (group.status_id === 'operating' || group.isCommissioning) && firstUnit.data_first_seen}
						<div class="text-xxs text-mid-grey">
							First generated at {formatTimestampLabel(
								getParsedDate(firstUnit.data_first_seen, offset)
							)}
						</div>
					{/if}

					{#if group.status_id === 'retired' && firstUnit.data_last_seen}
						<div class="text-xxs text-mid-grey">
							Last generated at {formatTimestampLabel(
								getParsedDate(firstUnit.data_last_seen, offset)
							)}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>
