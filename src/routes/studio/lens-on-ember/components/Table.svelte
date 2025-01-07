<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import { getContext, createEventDispatcher } from 'svelte';
	import { color } from 'd3-color';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import { groupOptions } from '../page-data-options/groups';
	import TableHeader from './TableHeader.svelte';

	
	/**
	 * @typedef {Object} Props
	 * @property {string[]} [seriesLoadsIds]
	 */

	/** @type {Props} */
	let { seriesLoadsIds = [] } = $props();

	const dispatch = createEventDispatcher();
	const { selectedFuelTechGroup } = getContext('filters');
	const {
		seriesNames: energySeriesNames,
		hiddenSeriesNames: energyHiddenSeriesNames,
		visibleSeriesNames: energyVisibleSeriesNames,
		seriesLabels: energySeriesLabels,
		seriesColours: energySeriesColours,
		hoverData: energyHoverData,
		hoverProportionData: energyHoverProportionData,
		focusData: energyFocusData,
		focusProportionData: energyFocusProportionData,
		convertAndFormatValue: energyConvertAndFormatValue,
		displayUnit: energyDisplayUnit,
		displayPrefix: energyDisplayPrefix,
		getNextPrefix: getEnergyNextPrefix,
		formatValue,
		hoverKey: energyHoverKey
	} = getContext('energy-data-viz');

	const {
		seriesNames: emissionsSeriesNames,
		visibleSeriesNames: emissionsVisibleSeriesNames,
		hoverData: emissionsHoverData,
		focusData: emissionsFocusData,
		convertAndFormatValue: emissionsConvertAndFormatValue,
		displayUnit: emissionsDisplayUnit,
		displayPrefix: emissionsDisplayPrefix,
		getNextPrefix: getEmissionsNextPrefix,
		hoverKey: emissionsHoverKey
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

	let sourceNames = $derived($energyVisibleSeriesNames
		.filter((/** @type {string} */ d) => !seriesLoadsIds.includes(d))
		.reverse());

	let loadNames = $derived($energyVisibleSeriesNames
		.filter((/** @type {string} */ d) => seriesLoadsIds.includes(d))
		.reverse());

	let combinedSeriesNames = $derived([
		...[...$energySeriesNames].reverse(),
		...[...$emissionsSeriesNames].reverse()
	]);
	let uniqueSeriesWithoutType = $derived([
		...new Set(
			combinedSeriesNames.map((id) => {
				// only want the first part of the id
				const parts = id.split('.');
				return parts[0];
			})
		)
	]);

	let energySourcesTotal = $derived($energyHoverData
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
		: 0);

	let energyLoadsTotal = $derived($energyHoverData
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
		: 0);

	let emissionsTotal = $derived($emissionsHoverData
		? $emissionsVisibleSeriesNames.reduce(
				/**
				 * @param {number} acc
				 * @param {string} id
				 */
				(acc, id) => acc + $emissionsHoverData[id],
				0
		  )
		: $emissionsFocusData
		? $emissionsVisibleSeriesNames.reduce(
				/**
				 * @param {number} acc
				 * @param {string} id
				 */
				(acc, id) => acc + $emissionsFocusData[id],
				0
		  )
		: 0);

	let isMetaPressed = false;

	/**
	 * @param {string} name
	 */
	function handleRowClick(name) {
		dispatch('row-click', { name, isMetaPressed, allNames: uniqueSeriesWithoutType });
	}

	/**
	 * @param {string} name
	 */
	function handleTouchstart(name) {
		dispatch('touchstart', { name });
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

	/**
	 * @param {string} energyName
	 * @param {string} emissionsName
	 */
	function handleMouseenter(energyName, emissionsName) {
		$energyHoverKey = energyName;
		$emissionsHoverKey = emissionsName;
	}
	function handleMouseleave() {
		$energyHoverKey = undefined;
		$emissionsHoverKey = undefined;
	}
</script>

<svelte:window onkeyup={handleKeyup} onkeydown={handleKeydown} />

<div class="sticky top-[105px] flex flex-col gap-2">
	<table class="w-full table-fixed border border-warm-grey mb-8">
		<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
			<tr>
				<th class="w-[45%]">
					<div class="flex items-center gap-4">
						<!-- <span class="block text-dark-grey text-sm font-medium ml-3">Technology</span> -->
						<div
							class="border border-mid-warm-grey text-xs inline-block rounded-md whitespace-nowrap ml-3"
						>
							<FormSelect
								paddingY="py-2"
								paddingX="px-4"
								selectedLabelClass="font-medium text-xs"
								options={groupOptions}
								selected={$selectedFuelTechGroup}
								on:change={(evt) => ($selectedFuelTechGroup = evt.detail.value)}
							/>
						</div>
					</div>
				</th>

				<th>
					<div class="flex flex-col items-end">
						<span class="block text-xs">Contribution</span>
						<span class="font-light text-xxs">%</span>
					</div>
				</th>

				<th>
					<div class="flex flex-col items-end">
						<span class="block text-xs">Generation</span>
						<button
							class="font-light text-xxs hover:underline"
							onclick={() => ($energyDisplayPrefix = getEnergyNextPrefix())}
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
							onclick={() => ($emissionsDisplayPrefix = getEmissionsNextPrefix())}
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
					<span class="ml-3"> Net total </span>
				</th>
				<th class="border-b border-warm-grey"></th>

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
				{@const isImports = name.includes('import')}
				{@const energyName = `${name}.energy.grouped`}
				{@const emissionsName = `${name}.emissions.grouped`}
				{@const energyValue = $energyHoverData
					? $energyHoverData[energyName]
					: $energyFocusData
					? $energyFocusData[energyName]
					: ''}
				{@const energyPercent = $energyHoverProportionData
					? $energyHoverProportionData[energyName]
					: $energyFocusProportionData
					? $energyFocusProportionData[energyName]
					: ''}
				{@const emissionsValue = $emissionsHoverData
					? $emissionsHoverData[emissionsName]
					: $emissionsFocusData
					? $emissionsFocusData[emissionsName]
					: ''}
				<tr
					onclick={() => handleRowClick(name)}
					onmouseenter={() => handleMouseenter(energyName, emissionsName)}
					onmouseleave={() => handleMouseleave()}
					ontouchstart={() => handleTouchstart(name)}
					ontouchend={bubble('touchend')}
					class="hover:bg-light-warm-grey group cursor-pointer text-sm relative top-2"
					class:opacity-50={$energyHiddenSeriesNames.includes(energyName)}
				>
					<td class="px-2 py-1">
						<div class="flex items-center gap-3 ml-3">
							{#if $energyHiddenSeriesNames.includes(energyName)}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
								></div>
							{:else}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded"
									style:background-color={$energySeriesColours[energyName]}
									style:border-color={darken($energySeriesColours[energyName])}
								></div>
							{/if}

							<div>
								{#if $energySeriesLabels[energyName]}
									{isImports && energyValue < 0 ? 'Export' : $energySeriesLabels[energyName]}
								{:else}
									{energyName}
								{/if}
								<!-- <span class="text-mid-grey">{getSublabel($energySeriesLabels[energyName])}</span> -->
							</div>
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono text-xs flex items-center justify-end gap-1">
							<span>
								{formatValue(energyPercent)}
							</span>
							<small>%</small>
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end">
							{$energyConvertAndFormatValue(energyValue)}
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end mr-3">
							{$emissionsConvertAndFormatValue(emissionsValue)}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>

		<tfoot>
			<tr>
				<td class="h-4"></td>
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
