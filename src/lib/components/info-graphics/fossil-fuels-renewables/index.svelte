<script>
	import StatsDatasets from '$lib/utils/stats-data-helpers/StatsDatasets';
	import TimeSeriesDatasets from '$lib/utils/time-series-helpers/TimeSeriesDatasets';
	import parseInterval from '$lib/utils/intervals';

	import { domainGroups, loadFts, totalId, labelReducer } from './helpers';
	import { colourReducer } from '$lib/stores/theme';

	import Chart from './Chart.svelte';

	/** @type {StatsData[]} */
	export let data;
	export let title = '';
	export let description = '';

	$: statsDatasets = new StatsDatasets(data, 'history')
		.group(domainGroups)
		.addTotalMinusLoads(loadFts, totalId);

	$: timeSeriesDatasets = new TimeSeriesDatasets(
		statsDatasets.data,
		parseInterval('1M'),
		'history',
		labelReducer,
		$colourReducer
	)
		.transform()
		.calculate12MthRollingSum()
		.convertToPercentage(totalId);

	$: dataset = timeSeriesDatasets.data;
	$: seriesNames = timeSeriesDatasets.seriesNames.filter((name) => name !== totalId);
	$: seriesColours = timeSeriesDatasets.seriesColours;
	$: seriesLabels = timeSeriesDatasets.seriesLabels;
</script>

<Chart
	{title}
	{description}
	{dataset}
	{seriesNames}
	{seriesColours}
	{seriesLabels}
	historicalDataset={statsDatasets.data}
/>
