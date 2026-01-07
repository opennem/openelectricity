<script>
	import { getNumberFormat } from '$lib/utils/formatters';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';
	import GenCapViz from './GenCapViz.svelte';
	import UnitTooltip from './UnitTooltip.svelte';
	import { regions } from './page-data-options/filters';

	const numberFormatter = getNumberFormat(0);

	let { facility } = $props();

	/**
	 * Get the background color for a fueltech
	 * @param {string} fueltech
	 * @returns {string}
	 */
	function getFueltechColor(fueltech) {
		return fuelTechColourMap[fueltech] || '#FFFFFF';
	}

	/**
	 * Get the region label
	 * @param {string} network_id
	 * @param {string} network_region
	 * @returns {string}
	 */
	function getRegionLabel(network_id, network_region) {
		if (network_region) {
			return regions.find((r) => r.value === network_region.toLowerCase())?.label || network_region;
		}
		return network_id?.toUpperCase();
	}

	const bgColor = facility.unit ? getFueltechColor(facility.unit.fueltech_id) : '#FFFFFF';
	const path = `https://explore.openelectricity.org.au/facility/au/${facility.network_id}/${facility.code}/`;
</script>

<li class="@container">
	<a
		class="grid grid-cols-12 items-center gap-2 sm:pr-6 group relative hover:no-underline hover:bg-warm-grey rounded-lg"
		class:bg-light-warm-grey={facility.unit.status_id === 'committed'}
		target="_blank"
		href={path}
	>
		<div class="p-4 pb-2 sm:pb-4 flex items-center gap-4 @container col-span-12 sm:col-span-7">
			<div class="flex gap-1 items-center">
				<span
					class="rounded-full p-2 block ml-2"
					class:text-black={facility.unit.fueltech_id === 'solar_utility' ||
						facility.unit.fueltech_id === 'gas_ocgt' ||
						facility.unit.fueltech_id === 'gas_recip'}
					class:text-white={facility.unit.fueltech_id !== 'solar_utility' &&
						facility.unit.fueltech_id !== 'gas_ocgt' &&
						facility.unit.fueltech_id !== 'gas_recip'}
					style="background-color: {bgColor};"
				>
					<FuelTechIcon fuelTech={facility.unit.fueltech_id} sizeClass={8} />
				</span>
			</div>

			<div
				class="text-base leading-base font-medium text-dark-grey flex flex-col @sm:flex-row items-bottom gap-0 @sm:gap-3"
			>
				{facility.name || 'Unnamed Facility'}

				{#if facility.unit.capacity_storage}
					<span class="text-xs items-baseline text-mid-grey" title="Storage Capacity">
						(<span class="font-mono">
							{numberFormatter.format(facility.unit.capacity_storage)}
						</span>
						<span class="text-xxs">MWh</span>)
					</span>
				{/if}

				{#if facility.units.length > 1}
					<small class="text-mid-warm-grey text-xs font-light">
						({facility.unit.code})
					</small>
				{/if}
			</div>

			{#if facility.unit.status_id === 'retired'}
				<div
					class="flex items-center gap-2 bg-mid-grey rounded-full px-4 py-1 text-xxs text-white uppercase font-light"
				>
					Retired
				</div>
			{/if}
		</div>

		<div
			class="col-span-12 sm:col-span-5 grid grid-cols-5 px-8 sm:px-0 py-2 sm:py-0 border-t border-warm-grey sm:border-t-0"
		>
			<div class="text-xs text-mid-grey col-span-2">
				<!-- {facility.network_id || 'Unknown Network'} -->
				<span
					class="block w-18 border-r-0 border-warm-grey pr-4 group-hover:border-light-warm-grey sm:border-r"
				>
					{getRegionLabel(facility.network_id, facility.network_region)}
				</span>
			</div>

			<div class="col-span-3 grid grid-cols-7 items-center gap-2 group">
				<div class="col-span-6 flex flex-row-reverse gap-5 items-center">
					<div class="flex justify-end items-baseline gap-2">
						<span
							class="font-mono text-sm text-dark-grey"
							title={facility.unit.capacity_maximum ? 'Maximum Capacity' : 'Registered Capacity'}
						>
							{numberFormatter.format(
								facility.unit.capacity_maximum || facility.unit.capacity_registered
							)}
						</span>

						<span class="text-xs text-mid-grey">MW</span>
					</div>

					{#if facility.isCommissioning}
						<div class="w-1/2 sm:w-1/2">
							<GenCapViz unit={facility.unit} fill={bgColor} />
						</div>
					{/if}
				</div>

				<div class="col-span-1 flex justify-end">
					<FacilityStatusIcon
						status={facility.unit.status_id}
						isCommissioning={facility.isCommissioning}
					/>
				</div>

				<div class="group-hover:block hidden absolute z-30 top-0 right-0">
					<UnitTooltip
						network_id={facility.network_id}
						unit={facility.unit}
						fill={bgColor}
						isCommissioning={facility.isCommissioning}
					/>
				</div>
			</div>
		</div>
	</a>
</li>
