<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { color } from 'd3-color';
	import TableHeader from './TableHeader.svelte';

	/** @type {string[]} */
	export let seriesLoadsIds = [];
	/** @type {string[]} */
	export let hiddenRowNames = [];
	export let title = '';

	const dispatch = createEventDispatcher();
	const { includeBatteryAndLoads } = getContext('scenario-filters');
	const {
		seriesNames: energySeriesNames,
		seriesLabels: energySeriesLabels,
		seriesColours: energySeriesColours,
		hoverData: energyHoverData,
		hoverTime: energyHoverTime,
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

	// $: console.log('capacitySeriesNames', $capacitySeriesNames);

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
		return colorString ? color(colorString).darker(0.5).formatHex() : 'transparent';
	}
</script>

<svelte:window on:keyup={handleKeyup} on:keydown={handleKeydown} />

<div class="sticky top-10 flex flex-col gap-2">
	<TableHeader
		includeBatteryAndLoads={$includeBatteryAndLoads}
		hoverTime={$energyHoverTime || $energyFocusTime}
		on:change={() => ($includeBatteryAndLoads = !$includeBatteryAndLoads)}
	/>

	<table class="w-full border border-warm-grey">
		<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
			<tr>
				<th class="w-[40%]">
					<span class="block text-dark-grey text-sm font-medium ml-3">{title}</span>
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
					<div class="flex flex-col items-end">
						<span class="block text-xs">Capacity</span>
						<button
							class="font-light text-xxs hover:underline"
							on:click={() => ($capacityDisplayPrefix = getCapacityNextPrefix())}
						>
							{$capacityDisplayUnit}
						</button>
					</div>
				</th>

				<th>
					<div class="flex flex-col items-end">
						<span class="block text-xs">Emissions</span>
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

		<tbody class="border-b border-warm-grey">
			<tr>
				<td colspan="5" class="h-4" />
			</tr>
			{#each $energySeriesNames as name, i}
				<tr
					class="hover:bg-light-warm-grey group cursor-pointer text-sm"
					on:click={() => handleRowClick(name)}
					class:opacity-50={hiddenRowNames.includes(name)}
				>
					<!-- <td
						class:!pb-8={i === regionNames.length - 1}
						class:opacity-50={hiddenRowNames.includes(name)}
					>
						<div class="flex items-center gap-2">
							<div
								class="w-4 h-4 rounded-full"
								style="background-color: {$energySeriesColours[name]}"
							/>
							<div>
								{$energySeriesLabels[name]}
							</div>
						</div>
					</td> -->

					<td class="px-2 py-1">
						<div class="flex items-start gap-3 ml-3">
							{#if hiddenRowNames.includes(name)}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded bg-transparent border-mid-warm-grey group-hover:border-mid-grey relative top-1"
								/>
							{:else}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded relative top-1"
									style:background-color={$energySeriesColours[name]}
									style:border-color={darken($energySeriesColours[name])}
								/>
							{/if}
							<div>
								{$energySeriesLabels[name]}
							</div>
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end">
							{$energyHoverData
								? $energyConvertAndFormatValue($energyHoverData[name])
								: $energyFocusData
								? $energyConvertAndFormatValue($energyFocusData[name])
								: ''}
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end">
							{$capacityHoverData
								? $capacityConvertAndFormatValue($capacityHoverData[name])
								: $capacityFocusData
								? $capacityConvertAndFormatValue($capacityFocusData[name])
								: ''}
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end">
							{$emissionsHoverData
								? $emissionsConvertAndFormatValue($emissionsHoverData[name])
								: $emissionsFocusData
								? $emissionsConvertAndFormatValue($emissionsFocusData[name])
								: ''}
						</div>
					</td>
					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end mr-3">
							{$intensityHoverData
								? $intensityConvertAndFormatvalue($intensityHoverData[name])
								: $intensityFocusData
								? $intensityConvertAndFormatvalue($intensityFocusData[name])
								: ''}
						</div>
					</td>
				</tr>
			{/each}
			<tr>
				<td colspan="5" class="h-4" />
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
