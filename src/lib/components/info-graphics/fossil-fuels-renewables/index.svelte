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
	 * @property {boolean} [skipAnimation]
	 */

	/** @type {Props} */
	let { data, title = '', description = '', skipAnimation = false } = $props();

	let hasData = $derived(data && data.length > 0);

	let statsDatasets = $derived(
		hasData
			? new Statistic(data, 'history').group(domainGroups).addTotalMinusLoads(loadFts, totalId)
			: null
	);

	let timeSeriesDatasets = $derived(
		statsDatasets
			? new TimeSeries(statsDatasets.data, parseInterval('1M'), 'history', labelReducer, $colourReducer)
					.transform()
					.calculate12MthRollingSum()
					.convertToPercentage(totalId)
			: null
	);

	let dataset = $derived(timeSeriesDatasets?.data ?? []);
	let seriesNames = $derived(timeSeriesDatasets?.seriesNames.filter((name) => name !== totalId) ?? []);
	let seriesColours = $derived(timeSeriesDatasets?.seriesColours ?? {});
	let seriesLabels = $derived(timeSeriesDatasets?.seriesLabels ?? {});
</script>

{#if hasData}
	<Chart
		{title}
		{description}
		{dataset}
		{seriesNames}
		{seriesColours}
		{seriesLabels}
		{skipAnimation}
		historicalDataset={statsDatasets?.data ?? []}
	/>
{/if}
