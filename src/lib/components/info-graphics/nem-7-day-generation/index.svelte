<script>
	import parseInterval from '$lib/utils/intervals';
	import Statistic from '$lib/utils/Statistic';
	import TimeSeries from '$lib/utils/TimeSeries';
	import { dataTrackerLink } from '$lib/stores/app';

	import {
		domainGroups,
		domainOrder,
		loadFts,
		labelReducer,
		fuelTechName,
		legend
	} from './helpers';

	import { fuelTechColour, colourReducer } from '$lib/stores/theme';

	import Chart from './Chart.svelte';

	
	/**
	 * @typedef {Object} Props
	 * @property {StatsData[]} data
	 */

	/** @type {Props} */
	let { data } = $props();

	const xKey = 'date';

	let statsDatasets = $derived(new Statistic(data, 'history')
		.mergeAndInterpolate()
		.invertValues(loadFts)
		.group(domainGroups)
		.reorder(domainOrder).data);

	let timeSeriesDatasets = $derived(new TimeSeries(
		statsDatasets,
		parseInterval('5m'),
		'history',
		labelReducer,
		$colourReducer
	)
		.transform()
		.rollup(parseInterval('30m'), 'mean')
		.updateMinMax(loadFts));

	let dataset = $derived(timeSeriesDatasets.data);

	let displayLegend = $derived(legend.toReversed().map((d) => ({
		key: d,
		label: fuelTechName(d),
		colour: $fuelTechColour(d)
	})));
</script>

<div class="container max-w-none lg:container">
	<header>
		<h3>National Electricity Market</h3>
	</header>
</div>

{#if dataset.length === 0}
	<div class="container max-w-none lg:container">
		<p class="mt-6">No data</p>
	</div>
{:else}
	<section class="mt-16">
		<Chart
			{dataset}
			{xKey}
			yKey={[0, 1]}
			zKey="key"
			seriesNames={timeSeriesDatasets.seriesNames}
			seriesColours={timeSeriesDatasets.seriesColours}
			seriesLabels={timeSeriesDatasets.seriesLabels}
		/>

		<div class="container max-w-none lg:container md:mt-12">
			<footer class="block md:flex justify-between items-center">
				<dl class="flex flex-wrap gap-1">
					{#each displayLegend as { colour, label }}
						<dt class="flex items-center gap-2 text-xs text-mid-grey mr-3">
							<span class="w-4 h-4 block" style="background-color: {colour}"></span>
							<span>{label}</span>
						</dt>
					{/each}
				</dl>
				<a
					href={$dataTrackerLink}
					class="mt-12 md:mt-0 block text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
				>
					View tracker
				</a>
			</footer>
		</div>
	</section>
{/if}
