<script>
	import { getContext } from 'svelte';

	import { formatValue } from '../page-data-options/formatters';

	/** @type {string[]} */
	export let seriesLoadsIds = [];

	const {
		seriesNames: energySeriesNames,
		seriesLabels: energySeriesLabels,
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

<div class="sticky top-0 text-xs flex flex-col gap-12">
	<table class="w-full table-fixed">
		<thead>
			<tr>
				<th />
				<th><span class="block">Generation</span><small class="font-light">GWh</small></th>
				<th><span class="block">Capacity</span><small class="font-light">MW</small></th>
			</tr>
		</thead>

		<thead>
			<tr>
				<th class="!border-warm-grey">Sources</th>
				<th class="!border-warm-grey">{formatValue(energySourcesTotal)}</th>
				<th class="!border-warm-grey">{formatValue(capacitySourcesTotal)}</th>
			</tr>
		</thead>

		<tbody>
			{#each sourceNames as name}
				<tr>
					<td>{$energySeriesLabels[name]}</td>
					<td>{$energyHoverData ? formatValue($energyHoverData[name]) : ''}</td>
					<td>{$capacityHoverData ? formatValue($capacityHoverData[name]) : ''}</td>
				</tr>
			{/each}
		</tbody>

		<thead>
			<tr>
				<th class="!border-warm-grey">Loads</th>
				<th class="!border-warm-grey">{formatValue(energyLoadsTotal)}</th>
				<th class="!border-warm-grey" />
			</tr>
		</thead>

		<tbody>
			{#each loadNames as name}
				<tr>
					<td>{$energySeriesLabels[name]}</td>
					<td>{$energyHoverData ? formatValue($energyHoverData[name]) : ''}</td>
					<td>{$capacityHoverData ? formatValue($capacityHoverData[name]) : ''}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<table class="w-full table-fixed">
		<thead>
			<tr>
				<th />
				<th><span class="block">Volume</span><small class="font-light">tCO2e</small></th>
				<th><span class="block">Intensity</span><small class="font-light">kgCO2e/MWh</small></th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<th class="!border-b-0">Emissions</th>
				<td>{$emissionsHoverData ? formatValue($emissionsHoverData['au.emissions.total']) : ''}</td>
				<td
					>{$intensityHoverData
						? formatValue($intensityHoverData['au.emission_intensity'])
						: ''}</td
				>
			</tr>
		</tbody>
	</table>

	<!-- <table class="w-full table-fixed">
		<thead>
			<tr>
				<th />
				<th><span class="block">Capacity</span><small class="font-light">MW</small></th>
			</tr>
		</thead>

		<thead>
			<tr>
				<th class="!border-warm-grey">Total</th>
				<th class="!border-warm-grey">{formatValue(capacitySourcesTotal)}</th>
			</tr>
		</thead>

		<tbody>
			{#each $capacitySeriesNames as name}
				<tr>
					<td>{$capacitySeriesLabels[name]}</td>
					<td>{$capacityHoverData ? formatValue($capacityHoverData[name]) : ''}</td>
				</tr>
			{/each}
		</tbody>
	</table> -->
</div>

<style>
	th {
		@apply text-left border-b border-mid-warm-grey;
	}
</style>
