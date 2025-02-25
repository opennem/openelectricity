<script>
	import { run } from 'svelte/legacy';

	import { getContext } from 'svelte';
	import { startOfYear } from 'date-fns';
	import SparkLineArea from '$lib/components/info-graphics/integrated-system-plan/SparkLineArea.svelte';
	import {
		scenarioLabels,
		scenarioParagraphs,
		scenarioSummary,
		scenarioKeyPoints
	} from './descriptions';

	import { dataViewUnits } from './options';

	const {
		selectedModel,
		selectedScenario,
		selectedDisplayView,
		selectedDataView,
		isTechnologyDisplay,
		isScenarioDisplay
	} = getContext('scenario-filters');

	const { showPercentage } = getContext('scenario-data');

	const { cachedDisplayData } = getContext('scenario-cache');

	run(() => {
		console.log('cachedDisplayData', $cachedDisplayData[$selectedDisplayView]);
	});

	let displayUnit = $derived($isTechnologyDisplay
		? dataViewUnits[$selectedDataView]
		: $showPercentage
		? '% of demand'
		: dataViewUnits[$selectedDataView]);
	let displayData = $derived($cachedDisplayData[$selectedDisplayView]);
	let loadIds = $derived(displayData ? displayData.loadIds || [] : []);
	let displayDataNames = $derived(displayData
		? displayData.names.filter((d) => d !== 'historical') || []
		: []);
	let displayDatasets = $derived(displayData ? displayData.data || [] : []);

	let overlay = $derived($isScenarioDisplay
		? {
				xStartValue: startOfYear(new Date('2024-01-01')),
				xEndValue: startOfYear(new Date('2052-01-01'))
		  }
		: $selectedModel === 'aemo2024'
		? {
				xStartValue: startOfYear(new Date('2024-01-01')),
				xEndValue: startOfYear(new Date('2052-01-01'))
		  }
		: {
				xStartValue: startOfYear(new Date('2023-01-01')),
				xEndValue: startOfYear(new Date('2051-01-01'))
		  });
	let overlayLine =
		$derived($selectedModel === 'aemo2024' && !$isScenarioDisplay
			? { date: startOfYear(new Date('2024-01-01')) }
			: { date: startOfYear(new Date('2023-01-01')) });

	let names = $derived($isTechnologyDisplay ? [...displayDataNames].reverse() : displayDataNames);
	let dataset = $derived(displayDatasets.map((d) => {
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
				if ($isScenarioDisplay && name !== 'historical') {
					// if it is a scenario display, fill in the historical data
					obj[name] = obj.historical || 0;
				} else {
					obj[name] = 0;
				}
			}
		});

		return obj;
	}));

	run(() => {
		console.log('dataset', dataset);
	});

	let xTicks =
		$derived($selectedModel === 'aemo2024' || $isScenarioDisplay
			? [2010, 2024, 2040, 2052].map((year) => startOfYear(new Date(`${year}-01-01`)))
			: [2010, 2023, 2040, 2051].map((year) => startOfYear(new Date(`${year}-01-01`))));

	let hoverData = $state(null);
</script>

<div class="container max-w-none lg:container px-6 mx-auto md:grid grid-cols-2">
	<div class="relative h-auto">
		<div class="sticky top-0 pr-48">
			<h2 class="font-space uppercase text-sm text-mid-grey mb-12">
				Learn more about each scenario
			</h2>

			{#if $selectedModel && $selectedScenario}
				<h3 class="mb-12">{scenarioLabels[$selectedModel][$selectedScenario]}</h3>
				<p>{scenarioSummary[$selectedModel][$selectedScenario]}</p>

				<!-- <h5>Five Key Points</h5> -->
				<ul class="list-disc list-inside pl-5 my-12">
					{#each scenarioKeyPoints[$selectedModel][$selectedScenario] as key}
						<li class="font-bold">{key}</li>
					{/each}
				</ul>

				{#each scenarioParagraphs[$selectedModel][$selectedScenario] as paragraph, i}
					<p class="my-12">
						{#if scenarioParagraphs[$selectedModel][$selectedScenario].length - 1 === i}
							<strong>Net zero summary: </strong>
						{/if}
						{paragraph}
					</p>
				{/each}
			{/if}
		</div>
	</div>

	<div>
		<div class="grid grid-cols-3 border-mid-warm-grey">
			{#each names as key, i}
				<SparkLineArea
					class="p-8 border-mid-warm-grey border-b border-l last:border-r [&:nth-child(3n)]:border-r [&:nth-child(-n+3)]:border-t"
					id={`key-${i}`}
					{overlay}
					{overlayLine}
					{dataset}
					{key}
					{xTicks}
					title={displayData.labels[key]}
					colour={displayData.colours[key]}
					{hoverData}
					{displayUnit}
					isTechnologyDisplay={$isTechnologyDisplay}
					on:mousemove={(e) => (hoverData = /** @type {TimeSeriesData} */ (e.detail))}
					on:mouseout={() => (hoverData = undefined)}
				/>
			{/each}
		</div>
	</div>
</div>
