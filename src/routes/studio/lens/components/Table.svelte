<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { color } from 'd3-color';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import { groupOptions } from '../page-data-options/groups';
	import TableHeader from './TableHeader.svelte';

	/** @type {string[]} */
	export let seriesLoadsIds = [];
	/** @type {string[]} */
	export let hiddenRowNames = [];

	const dispatch = createEventDispatcher();
	const { selectedFuelTechGroup } = getContext('filters');
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
		seriesNames: emissionsSeriesNames,
		hoverData: emissionsHoverData,
		focusData: emissionsFocusData,
		convertAndFormatValue: emissionsConvertAndFormatValue,
		displayUnit: emissionsDisplayUnit,
		displayPrefix: emissionsDisplayPrefix,
		getNextPrefix: getEmissionsNextPrefix
	} = getContext('emissions-data-viz');

	// const {
	// 	hoverData: intensityHoverData,
	// 	focusData: intensityFocusData,
	// 	convertAndFormatValue: intensityConvertAndFormatvalue,
	// 	displayUnit: intensityDisplayUnit
	// } = getContext('intensity-data-viz');
	// const {
	// 	// seriesNames: capacitySeriesNames,
	// 	// seriesLabels: capacitySeriesLabels,
	// 	hoverData: capacityHoverData,
	// 	focusData: capacityFocusData,
	// 	convertAndFormatValue: capacityConvertAndFormatValue,
	// 	displayUnit: capacityDisplayUnit,
	// 	displayPrefix: capacityDisplayPrefix,
	// 	getNextPrefix: getCapacityNextPrefix
	// } = getContext('capacity-data-viz');

	// $: console.log('energySeriesNames', $energySeriesNames);
	// $: console.log('capacitySeriesNames', $capacitySeriesNames);

	$: sourceNames = $energySeriesNames
		.filter((/** @type {string} */ d) => !seriesLoadsIds.includes(d))
		.reverse();

	$: loadNames = $energySeriesNames
		.filter((/** @type {string} */ d) => seriesLoadsIds.includes(d))
		.reverse();

	$: combinedSeriesNames = [
		...[...$energySeriesNames].reverse(),
		...[...$emissionsSeriesNames].reverse()
	];
	$: uniqueSeriesWithoutType = [
		...new Set(
			combinedSeriesNames.map((id) => {
				const parts = id.split('.');
				parts.pop();
				return parts.join('.');
			})
		)
	];

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

	$: emissionsTotal = $emissionsHoverData
		? $emissionsSeriesNames.reduce(
				/**
				 * @param {number} acc
				 * @param {string} id
				 */
				(acc, id) => acc + $emissionsHoverData[id],
				0
		  )
		: $emissionsFocusData
		? $emissionsSeriesNames.reduce(
				/**
				 * @param {number} acc
				 * @param {string} id
				 */
				(acc, id) => acc + $emissionsFocusData[id],
				0
		  )
		: 0;

	let isMetaPressed = false;

	/**
	 * @param {string} name
	 */
	function handleRowClick(name) {
		dispatch('row-click', { name, isMetaPressed, allNames: uniqueSeriesWithoutType });
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
		return color(colorString).darker(0.5).formatHex();
	}

	// get string before () in label
	/**
	 * @param {string} label
	 */
	function getLabel(label) {
		return label.split(' (')[0];
	}

	// get string inside () in label
	/**
	 * @param {string} label
	 */
	function getSublabel(label) {
		const labelArr = label.split(' (');
		return labelArr.length > 1 ? `(${labelArr[1].slice(0, -1)})` : '';
	}
</script>

<svelte:window on:keyup={handleKeyup} on:keydown={handleKeydown} />

<div class="sticky top-10 flex flex-col gap-2">
	<TableHeader hoverTime={$energyHoverTime || $energyFocusTime} />

	<table class="w-full table-fixed border border-warm-grey mb-8">
		<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
			<tr>
				<th class="w-[60%]">
					<div class="flex items-center gap-4">
						<span class="block text-dark-grey text-sm font-medium ml-3">Technology</span>
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
						<span class="block text-xs">Emissions</span>
						<button
							class="font-light text-xxs hover:underline"
							on:click={() => ($emissionsDisplayPrefix = getEmissionsNextPrefix())}
						>
							{$emissionsDisplayUnit}
						</button>
					</div>
				</th>
			</tr>
		</thead>

		<thead>
			<tr>
				<th class="border-b border-warm-grey">
					<span class="ml-3"> Technology </span>
				</th>

				<th class="border-b border-warm-grey">
					<div class="font-mono flex flex-col items-end">
						{$energyConvertAndFormatValue(energySourcesTotal)}
					</div>
				</th>

				<th class="border-b border-warm-grey">
					<div class="font-mono flex flex-col items-end mr-3">
						{$emissionsConvertAndFormatValue(emissionsTotal)}
					</div>
				</th>
			</tr>
		</thead>

		<tbody>
			{#each uniqueSeriesWithoutType as name}
				{@const energyName = `${name}.energy`}
				{@const emissionsName = `${name}.emissions`}
				<tr
					on:click={() => handleRowClick(name)}
					class="hover:bg-light-warm-grey group cursor-pointer text-sm relative top-2"
					class:opacity-50={hiddenRowNames.includes(name)}
				>
					<td class="px-2 py-1">
						<div class="flex items-center gap-3 ml-3">
							{#if hiddenRowNames.includes(name)}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
								/>
							{:else}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded"
									style:background-color={$energySeriesColours[energyName]}
									style:border-color={darken($energySeriesColours[energyName])}
								/>
							{/if}

							<div>
								{getLabel($energySeriesLabels[energyName])}
								<span class="text-mid-grey">{getSublabel($energySeriesLabels[energyName])}</span>
							</div>
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end">
							{$energyHoverData
								? $energyConvertAndFormatValue($energyHoverData[energyName])
								: $energyFocusData
								? $energyConvertAndFormatValue($energyFocusData[energyName])
								: ''}
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end mr-3">
							{$emissionsHoverData
								? $emissionsConvertAndFormatValue($emissionsHoverData[emissionsName])
								: $emissionsFocusData
								? $emissionsConvertAndFormatValue($emissionsFocusData[emissionsName])
								: ''}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>

		<tfoot>
			<tr>
				<td class="h-4" />
			</tr>
		</tfoot>
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
