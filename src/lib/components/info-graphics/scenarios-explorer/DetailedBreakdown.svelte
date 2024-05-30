<script>
	import { getContext } from 'svelte';
	import { startOfYear } from 'date-fns';
	import SparkLineArea from '$lib/components/info-graphics/integrated-system-plan/SparkLineArea.svelte';
	import { scenarioLabels, scenarioDescriptions } from './descriptions';

	const { selectedModel, selectedScenario, selectedDisplayView } = getContext('scenario-filters');
	const { cachedDisplayData } = getContext('scenario-cache');

	// $: console.log('cachedDisplayData', $cachedDisplayData[$selectedDisplayView]);
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

		loadIds.forEach((id) => {
			obj[id] = -d[id];
		});

		return obj;
	});

	$: xTicks =
		$selectedModel === 'aemo2024'
			? [2010, 2024, 2040, 2052].map((year) => startOfYear(new Date(`${year}-01-01`)))
			: [2010, 2030, 2051].map((year) => startOfYear(new Date(`${year}-01-01`)));

	let hoverData = null;
</script>

<div class="max-w-screen-lg px-6 mx-auto md:grid grid-cols-3 gap-6">
	<div>
		<h2 class="font-space uppercase text-sm text-mid-grey mb-12">
			Learn more about each scenarios
		</h2>
		<h3>{scenarioLabels[$selectedModel][$selectedScenario]}</h3>
		<p>{scenarioDescriptions[$selectedModel][$selectedScenario]}</p>
	</div>

	<div class="col-span-2 grid grid-cols-3 gap-3">
		{#each names as key}
			<SparkLineArea
				class="p-8 border border-mid-warm-grey"
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
