<script>
	import { setContext, getContext } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	import { getScenarioJson } from '$lib/scenarios';
	import { getHistory, getAllRegionHistory } from '$lib/opennem';
	import selectOptionsMap from '$lib/utils/select-options-map';

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
		allScenarios,
		regionsOnly,
		defaultModelPathway,
		defaultPathwayOrder
	} from '$lib/components/info-graphics/scenarios-explorer/options';
	import { covertHistoryDataToTWh } from '$lib/components/info-graphics/scenarios-explorer/helpers';
	import DetailedBreakdown from '$lib/components/info-graphics/scenarios-explorer/DetailedBreakdown-new.svelte';

	export let data;
	const { articles, filters } = data;
	const analysisArticles = articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	);

	console.log('filters', filters);
	setContext('scenario-filters', filtersStore(filters));
	setContext('scenario-data', dataStore(filters));
	setContext('scenario-cache', cacheStore());

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

	$: defaultPathway = defaultModelPathway[$selectedModel];

	// selectedDisplayView.subscribe((value) => {
	// 	if (value === 'technology') {
	// 		$selectedGroup = 'detailed';
	// 	} else if (value === 'region') {
	// 		$selectedGroup = 'totals';
	// 	}
	// });

	$: if ($selectedMultipleScenarios.length === 0) {
		$selectedMultipleScenarios = [
			{
				id: 'aemo2024-step-change-cdp14',
				model: 'aemo2024',
				scenario: 'step_change',
				pathway: 'CDP14',
				colour: '#A078D7'
			},
			{
				id: 'aemo2024-progressive-change-cdp14',
				model: 'aemo2024',
				scenario: 'progressive_change',
				pathway: 'CDP14',
				colour: '#F480EE'
			},
			{
				id: 'aemo2024-green-energy-exports-cdp14',
				model: 'aemo2024',
				scenario: 'green_energy_exports',
				pathway: 'CDP14',
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
		const [historyData, scenarioData] = await Promise.all([
			getHistory(region),
			getScenarioJson(model, scenario)
		]);
		const scenarios = allScenarios.filter((d) => d.model === model);

		updateScenariosPathways(
			scenarios.map((d) => d.scenarioId),
			scenarioData.pathways
		);

		const filteredScenarioData = scenarioData.data.filter(
			(d) =>
				d.pathway === pathway &&
				d.region.toLowerCase() === region.toLowerCase() &&
				d.type === dataView
		);

		$projectionData = filteredScenarioData.map((d) => {
			return {
				...d,
				model: model
			};
		});

		$historicalData = covertHistoryDataToTWh(historyData);

		console.log('technologyProjectionData', $projectionData);
		console.log('technologyHistoricalData', $historicalData);
	}

	/**
	 * Get data for by scenario view
	 * @param {*} param0
	 */
	async function getScenarioData({ scenarios, region, dataView }) {
		const promises = await Promise.all([
			getHistory(region),
			...scenarios.map((d) => getScenarioJson(d.model, d.scenario))
		]);

		console.log('promises', promises);
		const historyData = promises[0];
		const scenarioData = promises.slice(1);

		console.log('scenarioData', scenarioData);

		/** @type {*} */
		const scenarioProjections = [];

		try {
			scenarios.forEach((scene, i) => {
				const sceneData = scenarioData[i].data;

				const filteredScenarioData = sceneData.filter(
					(d) =>
						d.pathway === scene.pathway &&
						d.region.toLowerCase() === region.toLowerCase() &&
						d.type === dataView
				);

				scenarioProjections.push({
					id: scene.id,
					model: scene.model,
					scenario: scene.scenario,
					pathway: scene.pathway,
					colour: scene.colour,
					data: filteredScenarioData
				});
			});

			$scenarioProjectionData = scenarioProjections;
			$scenarioHistoricalData = covertHistoryDataToTWh(historyData);

			console.log('scenarioProjections', scenarioProjections);
			console.log('scenarioHistoricalData', $scenarioHistoricalData);
		} catch (error) {
			// TODO: update
			let query = new URLSearchParams($page.url.searchParams.toString());
			goto(`?${query.toString()}#filters`);

			console.error('Error getting scenario data', error);
		}
	}

	/**
	 * Get data for by region view
	 * @param {*} param0
	 */
	async function getRegionData({ model, scenario, pathway, dataView }) {
		const [allHistoryData, scenarioData] = await Promise.all([
			getAllRegionHistory(),
			getScenarioJson(model, scenario)
		]);
		const scenarios = allScenarios.filter((d) => d.model === model);

		console.log('dataView', dataView);
		console.log('scenarioData', scenarioData);

		updateScenariosPathways(
			scenarios.map((d) => d.scenarioId),
			scenarioData.pathways
		);

		/** @type {*} */
		let regionHistory = [];

		regionsOnly.forEach((region) => {
			const filtered = allHistoryData.filter(
				(d) => d.region.toLowerCase() === region.toLowerCase()
			);

			regionHistory.push({
				region: region,
				data: covertHistoryDataToTWh(filtered)
			});
		});

		/** @type {*} */
		let regionProjections = [];
		regionsOnly.forEach((region) => {
			const filtered = scenarioData.data.filter(
				(d) =>
					d.pathway === pathway &&
					d.region.toLowerCase() === region.toLowerCase() &&
					d.type === dataView
			);
			regionProjections.push({
				region: region,
				data: filtered.map((d) => {
					return {
						...d,
						model: model
					};
				})
			});
		});

		$regionProjectionData = regionProjections;
		$regionHistoricalData = regionHistory;

		console.log('regionProjections', regionProjections);
		console.log('regionHistory', regionHistory);
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
<PageHeader>
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
<!-- <PublicBetaTag /> -->

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
