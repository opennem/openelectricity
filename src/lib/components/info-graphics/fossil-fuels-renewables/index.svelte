<script>
	import StatsDatasets from '$lib/utils/stats-data-helpers/StatsDatasets';
	import TimeSeriesDatasets from '$lib/utils/time-series-helpers/TimeSeriesDatasets';
	import parseInterval from '$lib/utils/intervals';

	import { domainGroups, loadFts, totalId, labelReducer, colourReducer } from './helpers';

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
		colourReducer
	)
		.transform()
		.calculate12MthRollingSum()
		.convertToPercentage(totalId);

	$: dataset = timeSeriesDatasets.data;
	$: seriesNames = timeSeriesDatasets.seriesNames.filter((name) => name !== totalId);
	$: seriesColours = timeSeriesDatasets.seriesColours;
	$: seriesLabels = timeSeriesDatasets.seriesLabels;

	let transitionDatasets = [];
	let index = 0;
	/** @type {number} */
	let timeout;

	$: {
		transitionDatasets.push(dataset[index]);
		index++;
		timeout = setTimeout(() => {
			// console.log('setTimeout', index);

			if (index === dataset.length) {
				clearTimeout(timeout);
				return;
			}
			transitionDatasets.push(dataset[index]);
			index++;

			// console.log('transitionDatasets', transitionDatasets);
		}, 1000);
	}
</script>

<!-- dataset={transitionDatasets} -->
<!-- {dataset} -->

<Chart
	{title}
	{description}
	{dataset}
	{seriesNames}
	{seriesColours}
	{seriesLabels}
	historicalDataset={statsDatasets.data}
/>
