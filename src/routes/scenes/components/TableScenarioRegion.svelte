<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { formatValue } from '$lib/utils/formatters';
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
		hoverData: energyHoverData
	} = getContext('energy-data-viz');

	const { hoverData: emissionsHoverData } = getContext('emissions-data-viz');
	const { hoverData: intensityHoverData } = getContext('intensity-data-viz');
	const {
		// seriesNames: capacitySeriesNames,
		// seriesLabels: capacitySeriesLabels,
		hoverData: capacityHoverData
	} = getContext('capacity-data-viz');

	// $: console.log('capacitySeriesNames', $capacitySeriesNames);

	$: hoverTime = $energyHoverData ? $energyHoverData['time'] : null;

	$: sourceNames = $energySeriesNames
		.filter((/** @type {string} */ d) => !seriesLoadsIds.includes(d))
		.reverse();

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
</script>

<svelte:window on:keyup={handleKeyup} on:keydown={handleKeydown} />

<div class="sticky top-10 flex flex-col gap-2">
	<TableHeader
		includeBatteryAndLoads={$includeBatteryAndLoads}
		{hoverTime}
		on:change={() => ($includeBatteryAndLoads = !$includeBatteryAndLoads)}
	/>

	<table class="w-full table-fixed border border-warm-grey">
		<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
			<tr>
				<th class="w-[40%]">
					<span class="block text-dark-grey text-sm font-semibold ml-3">{title}</span>
				</th>
				<th>
					<div class="flex flex-col items-end">
						<span class="block">Generation</span>
						<small class="font-light text-xxs">GWh</small>
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end">
						<span class="block">Emissions</span>
						<small class="font-light text-xxs">tCO2e</small>
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end">
						<span class="block">Intensity</span>
						<small class="font-light text-xxs">kgCO2e/MWh</small>
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end">
						<span class="block">Capacity</span>
						<small class="font-light text-xxs">MW</small>
					</div>
				</th>
			</tr>
		</thead>

		<tbody class="border-b border-warm-grey">
			{#each sourceNames as name, i}
				<tr on:click={() => handleRowClick(name)}>
					<td
						class:!pb-8={i === sourceNames.length - 1}
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
					</td>
					<td>
						<div class="flex flex-col items-end">
							{$energyHoverData ? formatValue($energyHoverData[name]) : ''}
						</div>
					</td>
					<td>
						<div class="flex flex-col items-end">
							{$emissionsHoverData ? formatValue($emissionsHoverData[name]) : ''}
						</div>
					</td>
					<td>
						<div class="flex flex-col items-end">
							{$intensityHoverData ? formatValue($intensityHoverData[name]) : ''}
						</div>
					</td>
					<td>
						<div class="flex flex-col items-end">
							{$capacityHoverData ? formatValue($capacityHoverData[name]) : ''}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.main-thead th {
		@apply px-8 py-6 text-xs font-semibold;
	}
	th {
		@apply text-left px-6 pt-6 pb-2 font-semibold;
	}
	td {
		@apply px-6 py-2 text-sm;
	}
</style>
