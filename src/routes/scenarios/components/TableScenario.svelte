<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { color } from 'd3-color';
	import { scenarioLabelMap } from '../page-data-options/models';
	import { modelLabelMap } from '../page-data-options/models';
	import TableHeader from './TableHeader.svelte';

	/** @type {string[]} */
	export let hiddenRowNames = [];
	export let title = '';

	const dispatch = createEventDispatcher();
	const { includeBatteryAndLoads } = getContext('scenario-filters');
	const { orderedModelScenarioPathways } = getContext('by-scenario');
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

	// $: orderedModels = Object.keys(modelScenarios).filter((d) => selectedModels.find((e) => e.model === d);
	// $: console.log('selectedModels', selectedModels);
	// $: console.log('orderedModels', orderedModels);
	// $: console.log('orderedModelScenarioPathways', $orderedModelScenarioPathways);

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
	<table class="w-full border border-warm-grey mb-8">
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

		<tbody>
			<tr>
				<td colspan="5" class="h-4" />
			</tr>

			<!-- historical-->
			<tr
				class="hover:bg-light-warm-grey group cursor-pointer text-sm"
				on:click={() => handleRowClick('historical')}
				class:opacity-50={hiddenRowNames.includes('historical')}
			>
				<td class="px-2 py-1">
					<div class="flex items-center gap-3 ml-3">
						{#if hiddenRowNames.includes('historical')}
							<div
								class="w-6 h-6 min-w-6 min-h-6 border rounded bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
							/>
						{:else}
							<div
								class="w-6 h-6 min-w-6 min-h-6 border rounded"
								style:background-color={$energySeriesColours['historical']}
								style:border-color={darken($energySeriesColours['historical'])}
							/>
						{/if}
						<div>Historical</div>
					</div>
				</td>

				<td class="px-2 py-1">
					<div class="font-mono flex flex-col items-end">
						{$energyHoverData
							? $energyConvertAndFormatValue($energyHoverData['historical'])
							: $energyFocusData
							? $energyConvertAndFormatValue($energyFocusData['historical'])
							: ''}
					</div>
				</td>

				<td class="px-2 py-1">
					<div class="font-mono flex flex-col items-end">
						{$capacityHoverData
							? $capacityConvertAndFormatValue($capacityHoverData['historical'])
							: $capacityFocusData
							? $capacityConvertAndFormatValue($capacityFocusData['historical'])
							: ''}
					</div>
				</td>

				<td class="px-2 py-1">
					<div class="font-mono flex flex-col items-end">
						{$emissionsHoverData
							? $emissionsConvertAndFormatValue($emissionsHoverData['historical'])
							: $emissionsFocusData
							? $emissionsConvertAndFormatValue($emissionsFocusData['historical'])
							: ''}
					</div>
				</td>
				<td class="px-2 py-1">
					<div class="font-mono flex flex-col items-end mr-3">
						{$intensityHoverData
							? $intensityConvertAndFormatvalue($intensityHoverData['historical'])
							: $intensityFocusData
							? $intensityConvertAndFormatvalue($intensityFocusData['historical'])
							: ''}
					</div>
				</td>
			</tr>

			<tr>
				<td colspan="5" class="h-4" />
			</tr>
		</tbody>

		<tbody class="border-b border-warm-grey">
			{#each $orderedModelScenarioPathways as { model, scenarios }}
				<tr>
					<th colspan="5" class="!pb-0">
						<h6 class="ml-3 mb-0 pb-2 border-b border-warm-grey mr-3">{modelLabelMap[model]}</h6>
					</th>
				</tr>

				{#each scenarios as { scenario, pathways }}
					{@const scenarioId = `${model}-${scenario}`}

					<tr>
						<td colspan="5" class="!pb-0">
							<span class="ml-5 mt-3 block font-space text-xs">
								{scenarioLabelMap[scenarioId] || ''}
							</span>
						</td>
					</tr>
					{#each pathways as pathway}
						{@const id = `${model}-${scenario}-${pathway}`}
						<tr
							class="hover:bg-light-warm-grey group cursor-pointer text-sm relative top-1"
							on:click={() => handleRowClick(id)}
							class:opacity-50={hiddenRowNames.includes(id)}
						>
							<td class="px-2 py-1">
								<div class="flex items-start gap-3 ml-3">
									{#if hiddenRowNames.includes(id)}
										<div
											class="w-6 h-6 min-w-6 min-h-6 border rounded bg-transparent border-mid-warm-grey group-hover:border-mid-grey relative top-1"
										/>
									{:else}
										<div
											class="w-6 h-6 min-w-6 min-h-6 border rounded relative top-1"
											style:background-color={$energySeriesColours[id]}
											style:border-color={darken($energySeriesColours[id])}
										/>
									{/if}
									<div class="text-mid-grey font-normal block">{pathway}</div>
								</div>
							</td>

							<td class="px-2 py-1">
								<div class="font-mono flex flex-col items-end">
									{$energyHoverData
										? $energyConvertAndFormatValue($energyHoverData[id])
										: $energyFocusData
										? $energyConvertAndFormatValue($energyFocusData[id])
										: ''}
								</div>
							</td>

							<td class="px-2 py-1">
								<div class="font-mono flex flex-col items-end">
									{$capacityHoverData
										? $capacityConvertAndFormatValue($capacityHoverData[id])
										: $capacityFocusData
										? $capacityConvertAndFormatValue($capacityFocusData[id])
										: ''}
								</div>
							</td>

							<td class="px-2 py-1">
								<div class="font-mono flex flex-col items-end">
									{$emissionsHoverData
										? $emissionsConvertAndFormatValue($emissionsHoverData[id])
										: $emissionsFocusData
										? $emissionsConvertAndFormatValue($emissionsFocusData[id])
										: ''}
								</div>
							</td>
							<td class="px-2 py-1">
								<div class="font-mono flex flex-col items-end mr-3">
									{$intensityHoverData
										? $intensityConvertAndFormatvalue($intensityHoverData[id])
										: $intensityFocusData
										? $intensityConvertAndFormatvalue($intensityFocusData[id])
										: ''}
								</div>
							</td>
						</tr>
					{/each}
				{/each}
				<tr>
					<td colspan="5" class="h-4" />
				</tr>
			{/each}
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
	td {
		@apply align-top;
	}
</style>
