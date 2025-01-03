<script>
	import Statistic from '$lib/utils/Statistic';
	import TimeSeries from '$lib/utils/TimeSeries';
	import parseInterval from '$lib/utils/intervals';

	import { domainGroups, loadFts, totalId, labelReducer } from './helpers';
	import { colourReducer } from '$lib/stores/theme';

	import Chart from './Chart.svelte';

	
	/**
	 * @typedef {Object} Props
	 * @property {StatsData[]} data
	 * @property {string} [title]
	 * @property {string} [description]
	 */

	/** @type {Props} */
	let { data, title = '', description = '' } = $props();

	let statsDatasets = $derived(new Statistic(data, 'history')
		.group(domainGroups)
		.addTotalMinusLoads(loadFts, totalId));

	let timeSeriesDatasets = $derived(new TimeSeries(
		statsDatasets.data,
		parseInterval('1M'),
		'history',
		labelReducer,
		$colourReducer
	)
		.transform()
		.calculate12MthRollingSum()
		.convertToPercentage(totalId));

	let dataset = $derived(timeSeriesDatasets.data);
	let seriesNames = $derived(timeSeriesDatasets.seriesNames.filter((name) => name !== totalId));
	let seriesColours = $derived(timeSeriesDatasets.seriesColours);
	let seriesLabels = $derived(timeSeriesDatasets.seriesLabels);
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
