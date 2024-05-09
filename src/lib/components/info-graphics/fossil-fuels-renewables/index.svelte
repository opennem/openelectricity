<script>
	import Statistic from '$lib/utils/Statistic';
	import TimeSeries from '$lib/utils/TimeSeries';
	import parseInterval from '$lib/utils/intervals';

	import { domainGroups, loadFts, totalId, labelReducer } from './helpers';
	import { colourReducer } from '$lib/stores/theme';

	import Chart from './Chart.svelte';

	/** @type {StatsData[]} */
	export let data;
	export let title = '';
	export let description = '';

	$: statsDatasets = new Statistic(data, 'history')
		.group(domainGroups)
		.addTotalMinusLoads(loadFts, totalId);

	$: timeSeriesDatasets = new TimeSeries(
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
