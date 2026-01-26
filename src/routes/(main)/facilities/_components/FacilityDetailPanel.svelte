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
	let filteredUnits = $derived(
		facility?.units?.filter((/** @type {any} */ unit) => unit.fueltech_id !== 'battery') ?? []
	);
	let filteredUnitCodes = $derived(new Set(filteredUnits.map((/** @type {any} */ u) => u.code)));

	let filteredFacility = $derived(
		facility
			? {
					...facility,
					units: filteredUnits
				}
			: null
	);

	let filteredPowerData = $derived(
		powerData && powerData.data.length
			? {
					...powerData,
					results: powerData.data[0].results?.filter((/** @type {any} */ r) =>
						filteredUnitCodes.has(r.columns?.unit_code)
					)
				}
			: null
	);
</script>

{#if facility}
	<div class="h-full flex flex-col">
		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-6">
			<!-- Power Chart -->
			{#if filteredPowerData}
				<div class="bg-light-warm-grey/30 rounded-xl p-4 -mx-2 mb-0">
					<FacilityPowerChart
						facility={filteredFacility}
						powerData={filteredPowerData}
						{timeZone}
						title="Power Generation (Last 3 Days)"
						chartHeight="h-[220px]"
						showZoomBrush={false}
						useDivergingStack={true}
					/>
				</div>
			{:else}
				<div
					class="bg-light-warm-grey/30 rounded-xl p-4 -mx-2 mb-0 h-[220px] flex items-center justify-center"
				>
					<p class="text-sm text-mid-grey">No power data available</p>
				</div>
			{/if}

			<!-- Units Table -->
			{#if filteredUnits.length}
				<div class="border border-warm-grey rounded-lg mx-2">
					<FacilityUnitsTable units={filteredUnits} compact />
				</div>
			{/if}

			<!-- Capacity Info -->
			<p class="text-xxs text-mid-grey mt-3 mx-2">
				Capacity shown is maximum capacity where available, otherwise registered capacity.
			</p>
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
