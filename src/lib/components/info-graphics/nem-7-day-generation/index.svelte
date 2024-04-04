<script>
	import parseInterval from '$lib/utils/intervals';
	import StatsDatasets from '$lib/utils/stats-data-helpers/StatsDatasets';
	import TimeSeriesDatasets from '$lib/utils/time-series-helpers/TimeSeriesDatasets';

	import {
		domainGroups,
		domainOrder,
		loadFts,
		labelReducer,
		colourReducer,
		fuelTechName,
		fuelTechColour,
		legend
	} from './helpers';

	import Chart from './Chart.svelte';

	/** @type {StatsData[]} */
	export let data;

	const xKey = 'date';

	$: statsDatasets = new StatsDatasets(data, 'history')
		.mergeAndInterpolate()
		.invertLoadValues(loadFts)
		.group(domainGroups)
		.reorder(domainOrder).data;

	$: timeSeriesDatasets = new TimeSeriesDatasets(
		statsDatasets,
		parseInterval('5m'),
		'history',
		labelReducer,
		colourReducer
	)
		.transform()
		.rollup(parseInterval('30m'), 'mean')
		.updateMinMax(loadFts);

	$: dataset = timeSeriesDatasets.data;

	$: console.log(domainOrder);
</script>

{#if dataset.length === 0}
	<p class="mt-6">No data</p>
{:else}
	<Chart
		{dataset}
		{xKey}
		yKey={[0, 1]}
		zKey="key"
		seriesNames={timeSeriesDatasets.seriesNames}
		seriesColours={timeSeriesDatasets.seriesColours}
		seriesLabels={timeSeriesDatasets.seriesLabels}
	/>

	<dl class="flex justify-center gap-6">
		{#each legend.toReversed() as d}
			<dt class="flex items-center gap-2 text-xs text-mid-grey">
				<span class="w-6 h-6 block rounded" style="background-color: {fuelTechColour(d)}" />
				<span>{fuelTechName(d)}</span>
			</dt>
		{/each}
	</dl>
{/if}
