<script>
	import {
		FacilityPowerChart,
		FacilityUnitsTable,
		getNetworkTimezone
	} from '$lib/components/charts/facility';
	import { getExploreUrl, groupUnits } from '../_utils/units';
	import { getRegionLabel } from '../_utils/filters';
	import formatValue from '../_utils/format-value';
	import { ExternalLink, MapPin } from '@lucide/svelte';
	import FuelTechBadge from './FuelTechBadge.svelte';

	/**
	 * @type {{
	 *   facility: any | null,
	 *   powerData: any | null
	 * }}
	 */
	let { facility = null, powerData = null } = $props();

	let timeZone = $derived(facility ? getNetworkTimezone(facility.network_id) : '+10:00');
	let explorePath = $derived(getExploreUrl(facility));

	// Facility info
	let regionLabel = $derived(
		facility ? getRegionLabel(facility.network_id, facility.network_region) : ''
	);
	let unitGroups = $derived(facility ? groupUnits(facility) : []);
	let totalCapacity = $derived(unitGroups.reduce((sum, g) => sum + g.totalCapacity, 0));
	let unitCount = $derived(facility?.units?.length ?? 0);

	// 3 days at 5-minute intervals = 3 * 24 * 12 = 864 data points
	const LAST_3_DAYS_POINTS = 3 * 24 * 12;

	/**
	 * Filter data array to last N points
	 * @param {any[]} data - Array of [timestamp, value] pairs
	 * @returns {any[]}
	 */
	function filterLastNPoints(data) {
		if (!data || data.length <= LAST_3_DAYS_POINTS) {
			return data;
		}
		return data.slice(-LAST_3_DAYS_POINTS);
	}

	// Filter out battery units for the primary chart
	let filteredUnits = $derived(
		facility?.units?.filter(
			(/** @type {any} */ unit) =>
				unit.fueltech_id !== 'battery_charging' && unit.fueltech_id !== 'battery_discharging'
		) ?? []
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
					data: [
						{
							...powerData.data[0],
							results: powerData.data[0].results
								?.filter((/** @type {any} */ r) => filteredUnitCodes.has(r.columns?.unit_code))
								.map((/** @type {any} */ r) => ({
									...r,
									data: filterLastNPoints(r.data)
								}))
						}
					]
				}
			: null
	);
</script>

{#if facility}
	<div class="h-full flex flex-col">
		<!-- Scrollable Content -->
		<div class="flex-1 overflow-y-auto px-6">
			<!-- Facility Info (hidden - to be formatted later) -->
			<div class="py-4 space-y-3 hidden">
				<!-- Region, Network, Code -->
				<div class="flex items-center gap-2 flex-wrap">
					<span
						class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-light-warm-grey text-dark-grey"
					>
						{regionLabel}
					</span>
					<span
						class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-light-warm-grey text-mid-grey"
					>
						{facility.network_id}
					</span>
					<span class="text-xs text-mid-grey font-mono">{facility.code}</span>
				</div>

				<!-- Capacity & Units summary -->
				<div class="flex items-center gap-4">
					<div class="flex items-baseline gap-1">
						<span class="font-mono text-lg text-dark-grey">{formatValue(totalCapacity)}</span>
						<span class="text-xs text-mid-grey">MW</span>
					</div>
					<span class="text-xs text-mid-grey">
						{unitCount} unit{unitCount !== 1 ? 's' : ''}
					</span>
				</div>

				<!-- Fuel tech badges -->
				{#if unitGroups.length}
					<div class="flex items-center gap-1.5 flex-wrap">
						{#each unitGroups as group (`${group.fueltech_id}-${group.status_id}`)}
							<div class="flex items-center gap-1">
								<FuelTechBadge
									fueltech_id={group.fueltech_id}
									status_id={group.status_id}
									isCommissioning={group.isCommissioning}
									size="sm"
								/>
								<span class="text-xs text-mid-grey">
									{formatValue(group.totalCapacity)} MW
								</span>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Location -->
				{#if facility.location?.lat && facility.location?.lng}
					<div class="flex items-center gap-1 text-xs text-mid-grey">
						<MapPin size={12} />
						<span>{facility.location.lat.toFixed(4)}, {facility.location.lng.toFixed(4)}</span>
					</div>
				{/if}

				<!-- Description -->
				{#if facility.description}
					<p class="text-sm text-mid-grey">{facility.description}</p>
				{/if}
			</div>

			<!-- Power Chart -->
			{#if filteredPowerData}
				<div class="bg-light-warm-grey/30 rounded-xl p-4 -mx-2 mb-0">
					<FacilityPowerChart
						facility={filteredFacility}
						powerData={filteredPowerData}
						{timeZone}
						title="Power Generation (Last 3 Days)"
						chartHeight="h-[350px]"
						useDivergingStack={true}
					/>
				</div>
			{:else if powerData}
				<div
					class="bg-light-warm-grey/30 rounded-xl p-4 -mx-2 mb-0 h-[350px] flex items-center justify-center"
				>
					<p class="text-sm text-mid-grey">No power data available</p>
				</div>
			{:else}
				<div
					class="bg-light-warm-grey/30 rounded-xl p-4 -mx-2 mb-0 h-[350px] animate-pulse"
				></div>
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
		<div class="shrink-0 p-4 border-t border-warm-grey bg-white flex justify-end">
			<a
				href={explorePath}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center justify-center gap-2 w-auto px-12 py-3 text-sm font-medium text-white bg-dark-grey hover:bg-black rounded-lg transition-colors"
			>
				<ExternalLink size={14} />
				View Facility
			</a>
		</div>
	</div>
{/if}
