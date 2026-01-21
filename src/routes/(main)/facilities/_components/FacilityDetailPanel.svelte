<script>
	import {
		FacilityPowerChart,
		FacilityUnitsTable,
		getNetworkTimezone
	} from '$lib/components/charts/facility';
	import { getExploreUrl } from '../_utils/units';
	import { ExternalLink } from '@lucide/svelte';

	/**
	 * @type {{
	 *   facility: any | null,
	 *   powerData: any | null
	 * }}
	 */
	let { facility, powerData = null } = $props();

	let timeZone = $derived(facility ? getNetworkTimezone(facility.network_id) : '+10:00');
	let explorePath = $derived(getExploreUrl(facility));
</script>

{#if facility}
	<div class="h-full flex flex-col">
		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-6">
			<!-- Power Chart -->
			{#if powerData}
				<div class="bg-light-warm-grey/30 rounded-xl p-4 -mx-2 mb-0">
					<FacilityPowerChart
						{facility}
						{powerData}
						{timeZone}
						title="Power Generation (Last 3 Days)"
						chartHeight="h-[220px]"
						showZoomBrush={false}
					/>
				</div>
			{/if}

			<!-- Units Table -->
			{#if facility.units?.length}
				<div class="border border-warm-grey rounded-lg mx-3">
					<FacilityUnitsTable units={facility.units} compact />
				</div>
			{/if}
		</div>

		<!-- Fixed Footer -->
		<div class="shrink-0 p-4 border-t border-warm-grey bg-white">
			<a
				href={explorePath}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-medium text-white bg-dark-grey hover:bg-black rounded-lg transition-colors"
			>
				<ExternalLink size={14} />
				View Facility
			</a>
		</div>
	</div>
{/if}
