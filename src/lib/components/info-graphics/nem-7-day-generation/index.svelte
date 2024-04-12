<script>
	import parseInterval from '$lib/utils/intervals';
	import StatsDatasets from '$lib/utils/stats-data-helpers/StatsDatasets';
	import TimeSeriesDatasets from '$lib/utils/time-series-helpers/TimeSeriesDatasets';
	import ButtonLink from '$lib/components/ButtonLink.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { dataTrackerLink } from '$lib/stores/app';

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

		<div class="container max-w-none lg:container">
			<footer class="block md:flex justify-between">
				<dl class="flex flex-wrap gap-1">
					{#each legend.toReversed() as d}
						<dt class="flex items-center gap-2 text-xs text-mid-grey mr-3">
							<span class="w-4 h-4 block" style="background-color: {fuelTechColour(d)}" />
							<span>{fuelTechName(d)}</span>
						</dt>
					{/each}
				</dl>
				<a
					href={$dataTrackerLink}
					class="mt-12 block text-center rounded-xl font-space border border-black border-solid p-6 transition-all text-white bg-black hover:bg-dark-grey hover:no-underline"
				>
					View data tracker
				</a>
			</footer>
		</div>
	</section>
{/if}
