<script>
	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';
	import GenCapViz from './GenCapViz.svelte';
	import UnitGroupPopup from './UnitGroupPopup.svelte';
	import { getRegionLabel } from '../_utils/filters';
	import formatValue from '../_utils/format-value';
	import { getFueltechColor, needsDarkText } from '../_utils/fueltech-display';
	
	/**
	 * @type {{
	 *   facility: any,
	 *   isHighlighted?: boolean,
	 *   isSelected?: boolean,
	 *   isFirst?: boolean,
	 *   isLast?: boolean,
	 *   onclick?: (facility: any) => void,
	 *   onmouseenter?: (facility: any) => void,
	 *   onmouseleave?: () => void
	 * }}
	 */
	let {
		facility,
		isHighlighted = false,
		isSelected = false,
		isFirst = false,
		isLast = false,
		onclick,
		onmouseenter,
		onmouseleave
	} = $props();

	// Determine border radius based on position when selected
	let selectedRadiusClass = $derived.by(() => {
		if (!isSelected) return 'rounded-xl';
		if (isFirst && isLast) return 'rounded-xl';
		if (isFirst) return 'rounded-t-xl';
		if (isLast) return 'rounded-b-xl';
		return '';
	});

	let bgColor = $derived(facility.unit ? getFueltechColor(facility.unit.fueltech_id) : '#FFFFFF');
	let isDarkText = $derived(facility.unit ? needsDarkText(facility.unit.fueltech_id) : false);

	// Data for UnitGroupPopup
	let popupUnits = $derived(
		facility.unit
			? [
					{
						fueltech_id: facility.unit.fueltech_id,
						status_id: facility.unit.status_id,
						isCommissioning: facility.isCommissioning,
						capacity_maximum: facility.unit.capacity_maximum,
						capacity_registered: facility.unit.capacity_registered,
						max_generation: facility.unit.max_generation,
						max_generation_interval: facility.unit.max_generation_interval,
						data_first_seen: facility.unit.data_first_seen,
						data_last_seen: facility.unit.data_last_seen,
						bgColor
					}
				]
			: []
	);
</script>

<li
	class="@container"
	data-facility-code={facility.code}
	onmouseenter={() => onmouseenter?.(facility)}
	onmouseleave={() => onmouseleave?.()}
>
	<button
		class="w-full text-left grid grid-cols-12 items-center gap-2 sm:pr-6 group relative hover:bg-warm-grey cursor-pointer {selectedRadiusClass} {isSelected
			? 'ring-1 ring-mid-grey ring-inset'
			: ''}"
		class:bg-light-warm-grey={facility.unit.status_id === 'committed' &&
			!isHighlighted &&
			!isSelected}
		class:bg-warm-grey={isHighlighted || isSelected}
		onclick={() => onclick?.(facility)}
	>
		<div class="p-4 pb-2 sm:pb-4 flex items-center gap-4 @container col-span-12 sm:col-span-7">
			<div class="flex gap-1 items-center">
				<span
					class="rounded-full p-2 block ml-2"
					class:text-black={isDarkText}
					class:text-white={!isDarkText}
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
							{formatValue(facility.unit.capacity_storage)}
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
			class="col-span-12 sm:col-span-5 grid grid-cols-5 px-8 sm:px-0 py-2 sm:py-0 border-t sm:border-t-0"
			class:border-mid-warm-grey={isHighlighted || isSelected}
			class:border-warm-grey={!isHighlighted && !isSelected}
		>
			<div class="text-xs text-mid-grey col-span-2">
				<span
					class="block w-18 border-r-0 pr-4 group-hover:border-light-warm-grey sm:border-r"
					class:border-mid-warm-grey={isHighlighted || isSelected}
					class:border-warm-grey={!isHighlighted && !isSelected}
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
							{formatValue(facility.unit.capacity_maximum || facility.unit.capacity_registered)}
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

				<UnitGroupPopup units={popupUnits} network_id={facility.network_id} />
			</div>
		</div>
	</button>
</li>
