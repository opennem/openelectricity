<script>
	import { setContext, getContext } from 'svelte';
	import { browser } from '$app/environment';

	import { getModels, getAllRegionModels } from '$lib/models/index2';
	import { getHistory, getAllRegionHistory } from '$lib/opennem';
	import selectOptionsMap from '$lib/utils/select-options-map';
	import deepCopy from '$lib/utils/deep-copy';

	import PageHeader from '$lib/components/PageHeader.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import ScenarioExplorer from '$lib/components/info-graphics/scenarios-explorer/index.svelte';
	import ScenarioFilters from '$lib/components/info-graphics/scenarios-explorer/Filters-new.svelte';
	import ScenarioSelection from '$lib/components/info-graphics/scenarios-explorer/ScenarioSelection.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';
	import PublicBetaTag from './PublicBetaTag.svelte';

	import filtersStore from '$lib/components/info-graphics/scenarios-explorer/stores/filters';
	import dataStore from '$lib/components/info-graphics/scenarios-explorer/stores/data';
	import cacheStore from '$lib/components/info-graphics/scenarios-explorer/stores/cache';

	import {
		regionsOnly,
		defaultModelPathway,
		defaultPathwayOrder
	} from '$lib/components/info-graphics/scenarios-explorer/options';
	import { covertHistoryDataToTWh } from '$lib/components/info-graphics/scenarios-explorer/helpers';
	import DetailedBreakdown from '$lib/components/info-graphics/scenarios-explorer/DetailedBreakdown-new.svelte';

	setContext('scenario-filters', filtersStore());
	setContext('scenario-data', dataStore());
	setContext('scenario-cache', cacheStore());

	export let data;
	const { articles } = data;
	const analysisArticles = articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	);

	const {
		selectedDisplayView,
		selectedModel,
		selectedScenario,
		selectedPathway,
		selectedRegion,
		selectedDataView,
		selectedChartType,

		scenarioOptions,
		pathwayOptions,

		selectedMultipleScenarios,
		showScenarioOptions
	} = getContext('scenario-filters');

	const {
		projectionData,
		historicalData,
		scenarioProjectionData,
		scenarioHistoricalData,
		regionProjectionData,
		regionHistoricalData,
		selectedGroup
	} = getContext('scenario-data');

	/** @type {*} */
	let modelsData;
	/** @type {*} */
	let historyData;
	/** @type {*} */
	let allModelsRegionData;
	/** @type {*} */
	let allHistoryData;

	$: defaultPathway = defaultModelPathway[$selectedModel];

	selectedDisplayView.subscribe((value) => {
		if (value === 'technology') {
			$selectedGroup = 'detailed';
		} else if (value === 'region') {
			$selectedGroup = 'totals';
		}
	});

	$: if ($selectedMultipleScenarios.length === 0) {
		$selectedMultipleScenarios = [
			{
				id: 'aemo2024-step-change-cdp11_(odp)',
				model: 'aemo2024',
				scenario: 'step_change',
				pathway: 'CDP11 (ODP)',
				colour: '#A078D7'
			},
			{
				id: 'aemo2024-progressive-change-cdp11_(odp)',
				model: 'aemo2024',
				scenario: 'progressive_change',
				pathway: 'CDP11 (ODP)',
				colour: '#F480EE'
			},
			{
				id: 'aemo2024-green-energy-exports-cdp11_(odp)',
				model: 'aemo2024',
				scenario: 'green_energy_exports',
				pathway: 'CDP11 (ODP)',
				colour: '#069FAF'
			}
		];
	}

	// GET Data
	$: if (browser && $selectedDisplayView === 'technology') {
		console.log('get by technology');

		getTechnologyData({
			model: $selectedModel,
			region: $selectedRegion,
			scenario: $selectedScenario,
			pathway: $selectedPathway,
			dataView: $selectedDataView
		});
	}
	$: if (browser && $selectedDisplayView === 'scenario') {
		console.log('get by scenario');

		getScenarioData({
			model: $selectedModel,
			scenario: $selectedScenario,
			pathway: $selectedPathway,
			scenarios: $selectedMultipleScenarios,
			dataView: $selectedDataView,
			region: $selectedRegion
		});
	}

	$: if (browser && $selectedDisplayView === 'region') {
		console.log('get by region');

		getRegionData({
			model: $selectedModel,
			scenario: $selectedScenario,
			pathway: $selectedPathway,
			dataView: $selectedDataView
		});
	}

	/**
	 * Get data for by technology view
	 * @param {*} param0
	 */
	async function getTechnologyData({ model, region, scenario, pathway, dataView }) {
		modelsData = await getModels(model, region, dataView);
		historyData = await getHistory(region);

		updateScenariosPathways(modelsData.scenarios, modelsData.pathways);

		$projectionData = modelsData.outlook.data.filter(
			(d) => d.scenario === scenario && d.pathway === pathway
		);

		$historicalData = covertHistoryDataToTWh(deepCopy(historyData));
	}

	/**
	 * Get data for by scenario view
	 * @param {*} param0
	 */
	async function getScenarioData({ model, scenarios, region, scenario, pathway, dataView }) {
		console.log('comparing these scenarios', scenarios);

		modelsData = await getModels(model, region, dataView);

		const aemo2022 = await getModels('aemo2022', region, dataView);
		const aemo2024 = await getModels('aemo2024', region, dataView);

		const allModels = {
			aemo2022: aemo2022,
			aemo2024: aemo2024
		};

		historyData = await getHistory(region);

		console.log('modelsData', modelsData, historyData);

		/** @type {*} */
		let scenarioProjections = [];

		scenarios.forEach((scene) => {
			const filtered = allModels[scene.model].outlook.data.filter(
				(d) => d.scenario === scene.scenario && d.pathway === scene.pathway
			);

			scenarioProjections.push({
				id: scene.id,
				model: scene.model,
				scenario: scene.scenario,
				pathway: scene.pathway,
				colour: scene.colour,
				data: filtered
			});
		});

		$scenarioProjectionData = scenarioProjections;

		console.log('$scenarioProjectionData', $scenarioProjectionData);

		// modelsData.forEach((d) => {
		// 	const filtered = d.outlook.data.filter(
		// 		(d) => d.scenario === scenario && d.pathway === pathway
		// 	);
		// 	scenarioProjections.push({
		// 		model:
		// 		data: filtered
		// 	});
		// });
		// $projectionData = modelsData.outlook.data.filter(
		// 	(d) => d.scenario === scenario && d.pathway === pathway
		// );

		// $historicalData = covertHistoryDataToTWh(deepCopy(historyData));
		const convertedHistory = covertHistoryDataToTWh(deepCopy(historyData));

		$scenarioHistoricalData = convertedHistory;
		console.log('$scenarioHistoricalData', $scenarioHistoricalData);
	}

	/**
	 * Get data for by region view
	 * @param {*} param0
	 */
	async function getRegionData({ model, scenario, pathway, dataView }) {
		allModelsRegionData = await getAllRegionModels(model, dataView);
		allHistoryData = await getAllRegionHistory();

		updateScenariosPathways(allModelsRegionData[0].scenarios, allModelsRegionData[0].pathways);

		const converted = covertHistoryDataToTWh(deepCopy(allHistoryData));

		/** @type {*} */
		let regionProjections = [];
		allModelsRegionData.forEach((d) => {
			const filtered = d.outlook.data.filter(
				(d) => d.scenario === scenario && d.pathway === pathway
			);
			regionProjections.push({
				region: d.outlook.region,
				data: filtered
			});
		});
		console.log('regionProjections', regionProjections);
		$regionProjectionData = regionProjections;

		/** @type {*} */
		let regionHistory = [];
		regionsOnly.forEach((region) => {
			const filtered = converted.filter((d) => d.region === region);

			regionHistory.push({
				region: region,
				data: filtered
			});
		});
		$regionHistoricalData = regionHistory;
	}

	/**
	 *
	 * @param {*[]} scenarios
	 * @param {*[]} pathways
	 */
	function updateScenariosPathways(scenarios, pathways) {
		/** @type {string[]} */
		let sortedPathways = [];
		defaultPathwayOrder.forEach((pathway) => {
			if (pathways.find((d) => d === pathway)) {
				sortedPathways.push(pathway);
			}
		});

		scenarioOptions.set(selectOptionsMap(scenarios));
		pathwayOptions.set(selectOptionsMap(sortedPathways));

		/**
		 * set default values if the selected value is not in the updated list
		 */
		console.log(
			'selectedScenario',
			$selectedScenario,
			scenarios,
			scenarios.find((d) => d === $selectedScenario)
		);
		if (!scenarios.find((d) => d === $selectedScenario)) selectedScenario.set(scenarios[0]);
		if (!pathways.find((d) => d === $selectedPathway)) selectedPathway.set(defaultPathway);
	}
</script>

<Meta
	title="Scenarios"
	description="Open Electricity is a platform for exploring Australia's electricity system."
	image="/img/preview.jpg"
/>
<!-- <PageHeader>
	<div slot="main-heading">
		<div class="lg:my-36">
			<strong class="block py-8 font-space uppercase text-mid-grey font-medium text-sm">
				Scenarios
			</strong>
			<h1>Explore the future of Australia's national electricity market</h1>
		</div>
	</div>
	<div slot="sub-heading">
		<p class="lg:mt-24">
			A range of modelled scenarios exist which envision the evolution of Australia's National
			Electricity Market (NEM) over the coming decades.
		</p>
		<p>
			These scenarios aim to steer Australia towards a cost-effective, reliable and safe energy
			system en route to a zero-emissions electricity network.
		</p>
	</div>
</PageHeader>
<PublicBetaTag /> -->

<ScenarioFilters />

{#if $selectedDisplayView}
	<div
		class="transition-all relative"
		class:z-20={$showScenarioOptions}
		class:z-0={!$showScenarioOptions}
		class:opacity-100={$showScenarioOptions}
		class:h-auto={$showScenarioOptions}
		class:opacity-0={!$showScenarioOptions}
		class:h-0={!$showScenarioOptions}
	>
		<ScenarioSelection
			selectionMode={$selectedDisplayView === 'scenario' ? 'multiple' : 'single'}
		/>
	</div>
{/if}

<div class="p-1 md:p-6 mb-24 border-t border-warm-grey relative z-10">
	<ScenarioExplorer />
</div>

<DetailedBreakdown />

<div class="bg-white py-16 md:py-32">
	<div class="container max-w-none lg:container">
		<header class="flex justify-between items-center mb-8">
			<h3>Related analysis</h3>
		</header>
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
			{#each analysisArticles as article}
				<ArticleCard {article} />
			{/each}
		</div>
	</div>
</div>
