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
	import DetailedBreakdown from '$lib/components/info-graphics/scenarios-explorer/DetailedBreakdown.svelte';

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
		pathwayOptions
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
			dataView: $selectedDataView
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
	async function getScenarioData({ model, region, scenario, pathway, dataView }) {
		// Get all models, scenarios and pathways

		modelsData = await getModels(model, 'NEM', dataView);
		historyData = await getHistory('NEM');

		console.log('modelsData', modelsData, historyData);

		updateScenariosPathways(modelsData.scenarios, modelsData.pathways);

		const compare = modelsData.scenarios.map((s) => {
			return {
				id: model + s + 'CDP11',
				model: model,
				scenario: s,
				pathway: 'CDP11 (ODP)' // Use default pathway for now
			};
		});

		/** @type {*} */
		let scenarioProjections = [];

		compare.forEach((scene) => {
			const filtered = modelsData.outlook.data.filter(
				(d) => d.scenario === scene.scenario && d.pathway === scene.pathway
			);

			scenarioProjections.push({
				id: scene.id,
				model: scene.model,
				scenario: scene.scenario,
				pathway: scene.pathway,
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
	<ScenarioSelection selectionMode={$selectedDisplayView === 'scenario' ? 'multiple' : 'single'} />
{/if}

<div class="p-1 md:p-6 border-t border-warm-grey">
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
