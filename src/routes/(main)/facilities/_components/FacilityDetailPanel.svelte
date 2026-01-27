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

	// Filter out battery units for the primary chart
	let filteredUnits = $derived(
		facility?.units?.filter((/** @type {any} */ unit) => unit.fueltech_id !== 'battery') ?? []
	);
	let filteredUnitCodes = $derived(new Set(filteredUnits.map((/** @type {any} */ u) => u.code)));

	// Get battery units for the secondary chart
	let batteryUnits = $derived(
		facility?.units?.filter((/** @type {any} */ unit) => unit.fueltech_id === 'battery') ?? []
	);
	let batteryUnitCodes = $derived(new Set(batteryUnits.map((/** @type {any} */ u) => u.code)));
	let hasBattery = $derived(batteryUnits.length > 0);

	let filteredFacility = $derived(
		facility
			? {
					...facility,
					units: filteredUnits
				}
			: null
	);

	let batteryFacility = $derived(
		facility && hasBattery
			? {
					...facility,
					units: batteryUnits
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

	let batteryPowerData = $derived(
		powerData && powerData.data.length && hasBattery
			? {
					...powerData,
					results: powerData.data[0].results?.filter((/** @type {any} */ r) =>
						batteryUnitCodes.has(r.columns?.unit_code)
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

			<!-- Battery Section (Testing) -->
			{#if hasBattery && batteryPowerData}
				<div class="mt-4 mx-2 p-3 border-2 border-dashed rounded-lg" style="border-color: #f97316; background-color: #fff7ed;">
					<div class="flex items-center gap-2 mb-2">
						<span class="text-xs font-bold uppercase tracking-wide" style="color: #c2410c;">Battery Storage</span>
						<span class="text-[10px] px-1.5 py-0.5 rounded font-medium" style="background-color: #fed7aa; color: #9a3412;">Testing</span>
					</div>

					<!-- Battery Chart -->
					<div class="bg-white rounded-lg p-3 mb-3">
						<FacilityPowerChart
							facility={batteryFacility}
							powerData={batteryPowerData}
							{timeZone}
							title=""
							chartHeight="h-[150px]"
							showZoomBrush={false}
							useDivergingStack={true}
						/>
					</div>

					<!-- Battery Units Table -->
					<div class="border rounded-lg bg-white" style="border-color: #fdba74;">
						<FacilityUnitsTable units={batteryUnits} compact />
					</div>
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
