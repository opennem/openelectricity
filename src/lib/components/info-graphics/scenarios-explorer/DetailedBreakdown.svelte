<script>
	import { getContext } from 'svelte';
	import { startOfYear } from 'date-fns';
	import SparkLineArea from '$lib/components/info-graphics/integrated-system-plan/SparkLineArea.svelte';
	import {
		scenarioLabels,
		scenarioDescriptions,
		scenarioSummary,
		scenarioKeyPoints
	} from './descriptions';

	const { selectedModel, selectedScenario, selectedDisplayView } = getContext('scenario-filters');
	const { cachedDisplayData } = getContext('scenario-cache');

	$: console.log('cachedDisplayData', $cachedDisplayData[$selectedDisplayView]);
	$: displayData = $cachedDisplayData[$selectedDisplayView];
	$: loadIds = displayData ? displayData.loadIds || [] : [];
	$: displayDataNames = displayData ? displayData.names || [] : [];
	$: displayDatasets = displayData ? displayData.data || [] : [];

	$: names =
		$selectedDisplayView === 'technology' ? [...displayDataNames].reverse() : displayDataNames;
	$: dataset = displayDatasets.map((d) => {
		const obj = {
			...d
		};

		// Invert load values back to positive
		loadIds.forEach((id) => {
			obj[id] = -d[id];
		});

		// Fill in any missing data so area chart renders properly
		displayDataNames.forEach((name) => {
			if (!obj[name]) {
				obj[name] = 0;
			}
		});

		return obj;
	});

	$: xTicks =
		$selectedModel === 'aemo2024'
			? [2010, 2024, 2040, 2052].map((year) => startOfYear(new Date(`${year}-01-01`)))
			: [2010, 2030, 2051].map((year) => startOfYear(new Date(`${year}-01-01`)));

	let hoverData = null;
</script>

<div class=" max-w-screen-lg px-6 mx-auto md:grid grid-cols-2 gap-6">
	<div class="relative h-auto">
		<div class="sticky top-0">
			<h2 class="font-space uppercase text-sm text-mid-grey mb-12">
				Learn more about each scenario
			</h2>

			{#if $selectedModel && $selectedScenario}
				<h3>{scenarioLabels[$selectedModel][$selectedScenario]}</h3>
				<p>{scenarioDescriptions[$selectedModel][$selectedScenario]}</p>

				<!-- <h5>Five Key Points</h5>
				<ul class="list-disc list-inside">
					{#each scenarioKeyPoints[$selectedModel][$selectedScenario] as key}
						<li>{key}</li>
					{/each}
				</ul> -->
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-3 border-mid-warm-grey">
		{#each names as key}
			<SparkLineArea
				class="p-8 border-mid-warm-grey border-b border-l last:border-r [&:nth-child(3n)]:border-r [&:nth-child(-n+3)]:border-t"
				{dataset}
				{key}
				{xTicks}
				title={displayData.labels[key]}
				colour={displayData.colours[key]}
				{hoverData}
				on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
				on:mouseout={() => (hoverData = undefined)}
			/>
		{/each}
	</div>
</div>
