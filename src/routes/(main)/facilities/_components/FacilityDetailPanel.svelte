<script>
	import {
		FacilityPowerChart,
		FacilityUnitsTable,
		getNetworkTimezone
	} from '$lib/components/charts/facility';
	import { getRegionLabel } from '../_utils/filters';
	import formatValue from '../_utils/format-value';
	import { groupUnits, getExploreUrl } from '../_utils/units';
	import { ExternalLink, MapPin } from '@lucide/svelte';

	/**
	 * @type {{
	 *   facility: any | null,
	 *   powerData: any | null
	 * }}
	 */
	let { facility, powerData = null } = $props();

	let timeZone = $derived(facility ? getNetworkTimezone(facility.network_id) : '+10:00');

	let unitGroups = $derived(groupUnits(facility, { skipBattery: true }));
	let totalCapacity = $derived(unitGroups.reduce((sum, g) => sum + g.totalCapacity, 0));
	let explorePath = $derived(getExploreUrl(facility));
</script>

{#if facility}
	<div class="p-6">
		<!-- Header: Location and Capacity -->
		<div class="flex items-center justify-between mb-6">
			<div class="flex items-center gap-2 text-sm text-mid-grey">
				<MapPin size={16} />
				<span>{getRegionLabel(facility.network_id, facility.network_region)}</span>
				<span class="text-warm-grey">•</span>
				<span class="uppercase text-xs">{facility.network_id}</span>
			</div>
			<div class="flex items-baseline gap-1">
				<span class="font-mono text-xl font-medium text-dark-grey">
					{formatValue(totalCapacity)}
				</span>
				<span class="text-xs text-mid-grey">MW</span>
			</div>
		</div>

		<!-- Power Chart -->
		{#if powerData}
			<div class="mb-6">
				<h3 class="text-sm font-medium text-dark-grey mb-3">Power Generation (Last 3 Days)</h3>
				<FacilityPowerChart
					{facility}
					{powerData}
					{timeZone}
					chartHeight="h-[250px]"
					showZoomBrush={false}
				/>
			</div>
		{/if}

		<!-- Units Table -->
		{#if facility.units?.length}
			<div class="mt-6">
				<h3 class="text-sm font-medium text-dark-grey mb-3">All Units</h3>
				<FacilityUnitsTable units={facility.units} compact />
			</div>
		{/if}

		<!-- External link -->
		<div class="mt-6 pt-6 border-t border-warm-grey">
			<a
				href={explorePath}
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-dark-grey text-white hover:bg-black transition-colors text-sm font-medium"
			>
				<ExternalLink size={16} />
				View Facility
			</a>
		</div>
	</div>
{/if}
