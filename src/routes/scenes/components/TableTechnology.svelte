<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { color } from 'd3-color';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import { groupOptions } from '../page-data-options/groups-technology';
	import TableHeader from './TableHeader.svelte';

	/** @type {string[]} */
	export let seriesLoadsIds = [];
	/** @type {string[]} */
	export let hiddenRowNames = [];

	const dispatch = createEventDispatcher();
	const { selectedFuelTechGroup, includeBatteryAndLoads } = getContext('scenario-filters');
	const {
		seriesNames: energySeriesNames,
		seriesLabels: energySeriesLabels,
		seriesColours: energySeriesColours,
		hoverTime: energyHoverTime,
		hoverData: energyHoverData,
		focusData: energyFocusData,
		focusTime: energyFocusTime,
		convertAndFormatValue: energyConvertAndFormatValue,
		displayUnit: energyDisplayUnit,
		displayPrefix: energyDisplayPrefix,
		getNextPrefix: getEnergyNextPrefix
	} = getContext('energy-data-viz');

	const {
		hoverData: emissionsHoverData,
		focusData: emissionsFocusData,
		convertAndFormatValue: emissionsConvertAndFormatValue,
		displayUnit: emissionsDisplayUnit,
		displayPrefix: emissionsDisplayPrefix,
		getNextPrefix: getEmissionsNextPrefix
	} = getContext('emissions-data-viz');
	const {
		hoverData: intensityHoverData,
		focusData: intensityFocusData,
		convertAndFormatValue: intensityConvertAndFormatvalue,
		displayUnit: intensityDisplayUnit
	} = getContext('intensity-data-viz');
	const {
		// seriesNames: capacitySeriesNames,
		// seriesLabels: capacitySeriesLabels,
		hoverData: capacityHoverData,
		focusData: capacityFocusData,
		convertAndFormatValue: capacityConvertAndFormatValue,
		displayUnit: capacityDisplayUnit,
		displayPrefix: capacityDisplayPrefix,
		getNextPrefix: getCapacityNextPrefix
	} = getContext('capacity-data-viz');

	// $: console.log('energySeriesNames', $energySeriesNames);
	// $: console.log('capacitySeriesNames', $capacitySeriesNames);

	$: sourceNames = $energySeriesNames
		.filter((/** @type {string} */ d) => !seriesLoadsIds.includes(d))
		.reverse();

	$: loadNames = $energySeriesNames
		.filter((/** @type {string} */ d) => seriesLoadsIds.includes(d))
		.reverse();

	$: energySourcesTotal = $energyHoverData
		? sourceNames.reduce(
				/**
				 * @param {number} acc
				 * @param {string} id
				 */
				(acc, id) => acc + $energyHoverData[id],
				0
		  )
		: $energyFocusData
		? sourceNames.reduce(
				/**
				 * @param {number} acc
				 * @param {string} id
				 */
				(acc, id) => acc + $energyFocusData[id],
				0
		  )
		: 0;
	$: energyLoadsTotal = $energyHoverData
		? loadNames.reduce(
				/**
				 * @param {number} acc
				 * @param {string} id
				 */
				(acc, id) => acc + $energyHoverData[id],
				0
		  )
		: $energyFocusData
		? loadNames.reduce(
				/**
				 * @param {number} acc
				 * @param {string} id
				 */
				(acc, id) => acc + $energyFocusData[id],
				0
		  )
		: 0;

	$: capacitySourcesTotal = $capacityHoverData
		? sourceNames.reduce(
				/**
				 * @param {number} acc
				 * @param {string} id
				 */
				(acc, id) => acc + $capacityHoverData[id],
				0
		  )
		: $capacityFocusData
		? sourceNames.reduce(
				/**
				 * @param {number} acc
				 * @param {string} id
				 */
				(acc, id) => acc + $capacityFocusData[id],
				0
		  )
		: 0;

	let isMetaPressed = false;

	/**
	 * @param {string} name
	 */
	function handleRowClick(name) {
		dispatch('row-click', { name, isMetaPressed, allNames: $energySeriesNames });
	}

	function handleKeyup() {
		isMetaPressed = false;
	}

	/**
	 * @param {KeyboardEvent} evt
	 */
	function handleKeydown(evt) {
		if (evt.metaKey || evt.altKey) {
			console.log(' key pressed', evt.altKey, evt.metaKey);
			isMetaPressed = true;
		} else {
			isMetaPressed = false;
		}
	}

	/**
	 * @param {string} colorString
	 */
	function darken(colorString) {
		// @ts-ignore
		return color(colorString).darker(0.5).formatHex();
	}
</script>

<svelte:window on:keyup={handleKeyup} on:keydown={handleKeydown} />

<div class="sticky top-10 flex flex-col gap-2">
	<TableHeader
		includeBatteryAndLoads={$includeBatteryAndLoads}
		hoverTime={$energyHoverTime || $energyFocusTime}
		on:change={() => ($includeBatteryAndLoads = !$includeBatteryAndLoads)}
	/>

	<table class="w-full table-fixed border border-warm-grey mb-8">
		<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
			<tr>
				<th class="w-[60%]">
					<div class="flex items-center gap-4">
						<span class="block text-dark-grey text-sm font-semibold ml-3">Technology</span>
						<div
							class="border border-mid-warm-grey text-xs inline-block rounded-md whitespace-nowrap"
						>
							<FormSelect
								paddingY="py-2"
								paddingX="px-4"
								selectedLabelClass="font-medium text-sm"
								options={groupOptions}
								selected={$selectedFuelTechGroup}
								on:change={(evt) => ($selectedFuelTechGroup = evt.detail.value)}
							/>
						</div>
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end">
						<span class="block text-xs">Generation</span>
						<button
							class="font-light text-xxs hover:underline"
							on:click={() => ($energyDisplayPrefix = getEnergyNextPrefix())}
						>
							{$energyDisplayUnit}
						</button>
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end mr-3">
						<span class="block text-xs">Capacity</span>
						<button
							class="font-light text-xxs hover:underline"
							on:click={() => ($capacityDisplayPrefix = getCapacityNextPrefix())}
						>
							{$capacityDisplayUnit}
						</button>
					</div>
				</th>
			</tr>
		</thead>

		<thead>
			<tr>
				<th class="border-b border-warm-grey">
					<span class="ml-3"> Sources </span>
				</th>
				<th class="border-b border-warm-grey">
					<div class="flex flex-col items-end">
						{$energyConvertAndFormatValue(energySourcesTotal)}
					</div>
				</th>
				<th class="border-b border-warm-grey">
					<div class="flex flex-col items-end mr-3">
						{$capacityConvertAndFormatValue(capacitySourcesTotal)}
					</div>
				</th>
			</tr>
		</thead>

		<tbody>
			{#each sourceNames as name, i}
				<tr
					on:click={() => handleRowClick(name)}
					class="hover:bg-light-warm-grey group cursor-pointer text-sm relative top-2"
				>
					<td class:opacity-50={hiddenRowNames.includes(name)} class="px-2 py-1">
						<div class="flex items-center gap-3 ml-3">
							{#if hiddenRowNames.includes(name)}
								<div
									class="w-5 h-5 border rounded bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
								/>
							{:else}
								<div
									class="w-5 h-5 border rounded"
									style:background-color={$energySeriesColours[name]}
									style:border-color={darken($energySeriesColours[name])}
								/>
							{/if}

							<span>
								{$energySeriesLabels[name]}
							</span>
						</div>
					</td>
					<td class="px-2 py-1">
						<div class="flex flex-col items-end">
							{$energyHoverData
								? $energyConvertAndFormatValue($energyHoverData[name])
								: $energyFocusData
								? $energyConvertAndFormatValue($energyFocusData[name])
								: ''}
						</div>
					</td>
					<td class="px-2 py-1">
						<div class="flex flex-col items-end mr-3">
							{$capacityHoverData
								? $capacityConvertAndFormatValue($capacityHoverData[name])
								: $capacityFocusData
								? $capacityConvertAndFormatValue($capacityFocusData[name])
								: ''}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>

		{#if loadNames.length > 0}
			<thead>
				<tr>
					<th class="border-b border-warm-grey">
						<span class="ml-3"> Loads </span>
					</th>
					<th class="border-b border-warm-grey">
						<div class="flex flex-col items-end">
							{$energyConvertAndFormatValue(energyLoadsTotal)}
						</div>
					</th>
					<th class="border-b border-warm-grey" />
				</tr>
			</thead>

			<tbody>
				{#each loadNames as name, i}
					<tr
						on:click={() => handleRowClick(name)}
						class="hover:bg-light-warm-grey group cursor-pointer text-sm relative top-2"
					>
						<td
							class:!pb-8={i === sourceNames.length - 1}
							class:opacity-50={hiddenRowNames.includes(name)}
							class="px-2 py-1"
						>
							<div class="flex items-center gap-3 ml-3">
								{#if hiddenRowNames.includes(name)}
									<div
										class="w-5 h-5 border rounded bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
									/>
								{:else}
									<div
										class="w-5 h-5 border rounded"
										style:background-color={$energySeriesColours[name]}
										style:border-color={darken($energySeriesColours[name])}
									/>
								{/if}
								<span>
									{$energySeriesLabels[name]}
								</span>
							</div>
						</td>
						<td class="px-2 py-1">
							<div class="flex flex-col items-end">
								{$energyHoverData
									? $energyConvertAndFormatValue($energyHoverData[name])
									: $energyFocusData
									? $energyConvertAndFormatValue($energyFocusData[name])
									: ''}
							</div>
						</td>
						<td class="px-2 py-1">
							<div class="flex flex-col items-end mr-3">
								{$capacityHoverData
									? $capacityConvertAndFormatValue($capacityHoverData[name])
									: $capacityFocusData
									? $capacityConvertAndFormatValue($capacityFocusData[name])
									: ''}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		{/if}

		<tfoot>
			<tr>
				<td class="h-4" />
			</tr>
		</tfoot>
	</table>

	<table class="w-full table-fixed border border-warm-grey">
		<thead class="main-thead bg-light-warm-grey border-b border-t border-warm-grey">
			<tr>
				<th class="w-[60%]">
					<span class="block text-dark-grey text-sm font-semibold ml-3">Impact</span>
				</th>
				<th>
					<div class="flex flex-col items-end">
						<span class="block text-xs">Volume</span>
						<button
							class="font-light text-xxs hover:underline"
							on:click={() => ($emissionsDisplayPrefix = getEmissionsNextPrefix())}
						>
							{$emissionsDisplayUnit}
						</button>
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end mr-3">
						<span class="block text-xs">Intensity</span>
						<small class="font-light text-xxs">{$intensityDisplayUnit}</small>
					</div>
				</th>
			</tr>
		</thead>
		<tbody>
			<tr class="text-sm">
				<th class="px-2 !py-6">
					<div class="flex items-center gap-3 ml-3">
						<div
							class="w-5 h-5 border rounded"
							style="background-color: #444444; border-color: {darken('#444444')}"
						/>
						<span>Emissions</span>
					</div>
				</th>

				<th class="px-2 !py-6">
					<div class="flex flex-col items-end">
						{$emissionsHoverData
							? $emissionsConvertAndFormatValue($emissionsHoverData['au.emissions.total'])
							: $emissionsFocusData
							? $emissionsConvertAndFormatValue($emissionsFocusData['au.emissions.total'])
							: ''}
					</div>
				</th>
				<th class="px-2 !py-6">
					<div class="flex flex-col items-end mr-3">
						{$intensityHoverData
							? $intensityConvertAndFormatvalue($intensityHoverData['au.emission_intensity'])
							: $intensityFocusData
							? $intensityConvertAndFormatvalue($intensityFocusData['au.emission_intensity'])
							: ''}
					</div>
				</th>
			</tr>
		</tbody>
	</table>
</div>

<style>
	.main-thead th {
		@apply px-2 py-6 text-sm font-medium;
	}
	th {
		@apply text-left px-2 py-1 pt-6 font-medium;
	}
</style>
