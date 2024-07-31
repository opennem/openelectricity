<script>
	import { getContext } from 'svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import { groupOptions } from '../page-data-options/groups';
	import { formatValue } from '../page-data-options/formatters';

	/** @type {string[]} */
	export let seriesLoadsIds = [];

	const { selectedFuelTechGroup } = getContext('scenario-filters');
	const {
		seriesNames: energySeriesNames,
		seriesLabels: energySeriesLabels,
		seriesColours: energySeriesColours,
		hoverData: energyHoverData
	} = getContext('energy-data-viz');

	const { hoverData: emissionsHoverData } = getContext('emissions-data-viz');
	const { hoverData: intensityHoverData } = getContext('intensity-data-viz');
	const {
		seriesNames: capacitySeriesNames,
		seriesLabels: capacitySeriesLabels,
		hoverData: capacityHoverData
	} = getContext('capacity-data-viz');

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
		: 0;
</script>

<div class="sticky top-6 flex flex-col gap-12 border border-warm-grey">
	<table class="w-full table-fixed">
		<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
			<tr>
				<th class="w-[50%]">
					<div
						class="border border-mid-warm-grey text-xs inline-block rounded-md whitespace-nowrap"
					>
						<FormSelect
							paddingY="py-2"
							paddingX="px-4"
							options={groupOptions}
							selected={$selectedFuelTechGroup}
							on:change={(evt) => ($selectedFuelTechGroup = evt.detail.value)}
						/>
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end">
						<span class="block">Generation</span>
						<small class="font-light text-xxs">GWh</small>
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

		<thead>
			<tr>
				<th>Sources</th>
				<th>
					<div class="flex flex-col items-end">
						{formatValue(energySourcesTotal)}
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end">
						{formatValue(capacitySourcesTotal)}
					</div>
				</th>
			</tr>
		</thead>

		<tbody class="border-b border-warm-grey">
			{#each sourceNames as name, i}
				<tr>
					<td class:!pb-8={i === sourceNames.length - 1}>
						<div class="flex items-center gap-2">
							<div
								class="w-4 h-4 rounded-full"
								style="background-color: {$energySeriesColours[name]}"
							/>
							<span>
								{$energySeriesLabels[name]}
							</span>
						</div>
					</td>
					<td>
						<div class="flex flex-col items-end">
							{$energyHoverData ? formatValue($energyHoverData[name]) : ''}
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

		<thead>
			<tr>
				<th>Loads</th>
				<th>
					<div class="flex flex-col items-end">
						{formatValue(energyLoadsTotal)}
					</div>
				</th>
				<th />
			</tr>
		</thead>

		<tbody>
			{#each loadNames as name}
				<tr>
					<td>
						<div class="flex items-center gap-2">
							<div
								class="w-4 h-4 rounded-full"
								style="background-color: {$energySeriesColours[name]}"
							/>
							<span>
								{$energySeriesLabels[name]}
							</span>
						</div>
					</td>
					<td>
						<div class="flex flex-col items-end">
							{$energyHoverData ? formatValue($energyHoverData[name]) : ''}
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

	<table class="w-full table-fixed">
		<thead class="main-thead bg-light-warm-grey border-b border-t border-warm-grey">
			<tr>
				<th class="w-[50%]" />
				<th>
					<div class="flex flex-col items-end">
						<span class="block">Volume</span>
						<small class="font-light text-xxs">tCO2e</small>
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end">
						<span class="block">Intensity</span>
						<small class="font-light text-xxs">kgCO2e/MWh</small>
					</div>
				</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<th>
					<div class="flex items-center gap-2">
						<div class="w-4 h-4 rounded-full" style="background-color: #999" />
						<span>Emissions</span>
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end">
						{$emissionsHoverData ? formatValue($emissionsHoverData['au.emissions.total']) : ''}
					</div>
				</th>
				<th>
					<div class="flex flex-col items-end">
						{$intensityHoverData ? formatValue($intensityHoverData['au.emission_intensity']) : ''}
					</div>
				</th>
			</tr>
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
	tfoot th {
		@apply bg-light-warm-grey px-3 py-2;
	}
</style>
