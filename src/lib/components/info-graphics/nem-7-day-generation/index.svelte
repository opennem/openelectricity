<script>
	import parseInterval from '$lib/utils/intervals';
	import StatsDatasets from '$lib/utils/stats-data-helpers/StatsDatasets';
	import TimeSeriesDatasets from '$lib/utils/time-series-helpers/TimeSeriesDatasets';

	import { domainGroups, domainOrder, loadFts, labelReducer, colourReducer } from './helpers';

	import Chart from './Chart.svelte';

	/** @type {StatsData[]} */
	export let data;

	const xKey = 'date';

	$: statsDatasets = new StatsDatasets(data, 'history')
		.mergeAndInterpolate()
		.invertLoadValues(loadFts)
		// .group(domainGroups)
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
{/if}
