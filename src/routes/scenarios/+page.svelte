<script>
	import { browser } from '$app/environment';

	import { getModels, getAllRegionModels } from '$lib/models/index2';
	import { getHistory, getAllRegionHistory } from '$lib/opennem';
	import selectOptionsMap from '$lib/utils/select-options-map';

	import PageHeader from '$lib/components/PageHeader.svelte';

	import Explorer from '$lib/components/info-graphics/integrated-system-plan/Explorer/index.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';
	import Meta from '$lib/components/Meta.svelte';

	/** @type {*} */
	export let data;
	const { historyEnergyNemData, articles } = data;

	const analysisArticles = articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	);

	let selectedModel = 'aemo2024';
	let selectedScenario = 'step_change';
	let selectedPathway = 'CDP11 (ODP)';
	let selectedRegion = '';
	let selectedDataView = 'energy';
	let selectedDisplayView = 'technology';

	let modelScenarios = [];
	let modelPathways = [];

	let modelsData;
	let filteredModelsData;
	let historyData = historyEnergyNemData;
	/** @type {*} */
	let allHistoryData = [];
	/** @type {*} */
	let allModelsData = [];

	const regions = ['NSW1', 'QLD1', 'VIC1', 'SA1', 'TAS1'];

	$: console.log('selectedScenario', selectedScenario);
	$: console.log('selectedPathway', selectedPathway);
	$: console.log('modelsData', modelsData);
	$: console.log('filteredModelsData', filteredModelsData);

	$: if (modelsData) {
		modelScenarios = selectOptionsMap(modelsData.scenarios);
		modelPathways = selectOptionsMap(modelsData.pathways);

		filteredModelsData = {
			...modelsData,
			outlook: {
				...modelsData.outlook,
				data: modelsData.outlook.data.filter(
					(d) => d.scenario === selectedScenario && d.pathway === selectedPathway
				)
			}
		};
	}

	$: if (browser && selectedDisplayView === 'technology') {
		console.log('by technology');
		getModels(selectedModel, selectedRegion, selectedDataView).then((data) => (modelsData = data));
		getHistory(selectedRegion).then((data) => (historyData = data));
	}

	$: if (browser && selectedDisplayView === 'region') {
		console.log('by region');
		getAllRegionModels(selectedModel, selectedDataView).then((data) => (allModelsData = data));
		getAllRegionHistory().then((data) => (allHistoryData = data));
	}

	$: console.log('allHistoryData', allHistoryData);
	$: console.log('allModelsData', allModelsData);
	$: {
		let allHistory = [];

		if (allHistoryData.length) {
			console.log('combine history');

			allHistory = regions.map((region) => {
				const regionData = allHistoryData.filter((d) => d.region === region);

				const regionObj = {
					data_type: allHistoryData[0].data_type,
					region: region,
					units: allHistoryData[0].units,
					id: region,
					history: {
						interval: allHistoryData[0].history.interval,
						data: allHistoryData[0].history.data.map((v) => 0),
						start: allHistoryData[0].history.start,
						last: allHistoryData[0].history.last
					}
				};

				// sum values inside data array
				regionData.forEach((d) => {
					regionObj.history.data = regionObj.history.data.map((v, i) => v + d.history.data[i]);
				});

				return regionObj;
			});

			console.log('allHistory', allHistory);
		}
	}

	$: {
		let allModels = [];

		if (allModelsData.length) {
			console.log('combine models');

			allModelsData.forEach((regionModel) => {
				const fuelTechs = regionModel.fuelTechs;
				const pathways = regionModel.pathways;
				const scenarios = regionModel.scenarios;
				const outlookData = regionModel.outlook.data;

				const regionObj = {
					region: regionModel.region,
					fuelTechs: fuelTechs,
					pathways: pathways,
					scenarios: scenarios,
					outlook: {}
				};

				scenarios.forEach((scenario) => {
					pathways.forEach((pathway) => {
						const filtered = outlookData.filter(
							(d) => d.scenario === scenario && d.pathway === pathway
						);

						const outlookObj = {
							type: filtered[0].type,
							region: regionModel.region,
							units: filtered[0].units,
							id: `${regionModel.region}.${scenario}.${pathway.split(' ').join('_')}`,
							projection: {
								interval: filtered[0].projection.interval,
								data: filtered[0].projection.data.map((v) => 0),
								start: filtered[0].projection.start,
								last: filtered[0].projection.last
							}
						};

						// sum values inside data array
						filtered.forEach((d) => {
							outlookObj.projection.data = outlookObj.projection.data.map(
								(v, i) => v + d.projection.data[i]
							);
						});

						regionObj.outlook = outlookObj;
					});
				});

				allModels.push(regionObj);
			});

			console.log('allModels', allModels);
		}
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
</PageHeader> -->
<div class="bg-light-warm-grey py-6 md:py-4">
	<div class="container max-w-none lg:container md:flex items-center gap-3 md:gap-6">
		<span
			class="inline-block whitespace-nowrap uppercase font-space font-medium tracking-widest text-xs bg-warm-grey py-2 px-4 rounded-full mb-2 md:mb-0"
		>
			Public Beta
		</span>
		<div class="text-mid-grey text-sm font-light">
			This feature is in development. A more detailed Scenarios explorer will be available soon.
		</div>
	</div>
</div>

<div class="mt-12 md:mt-24">
	<Explorer
		{historyData}
		modelsData={filteredModelsData}
		{modelScenarios}
		{modelPathways}
		on:selected-model={(evt) => (selectedModel = evt.detail)}
		on:selected-scenario={(evt) => (selectedScenario = evt.detail)}
		on:selected-pathway={(evt) => (selectedPathway = evt.detail)}
		on:selected-region={(evt) => (selectedRegion = evt.detail)}
		on:selected-data-view={(evt) => (selectedDataView = evt.detail)}
		on:selected-display-view={(evt) => (selectedDisplayView = evt.detail)}
	/>
	<!-- <IspExplorer data={{ ispData: dataModels, outlookEnergyNem, historyEnergyNemData }} /> -->
</div>

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
