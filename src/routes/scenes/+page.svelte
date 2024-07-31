<script>
	import { setContext, getContext } from 'svelte';

	import { colourReducer } from '$lib/stores/theme';

	import ArticlesSection from './components/ArticlesSection.svelte';
	import Filters from './components/Filters.svelte';
	import EnergyChart from './components/EnergyChart.svelte';
	import EmissionsChart from './components/EmissionsChart.svelte';
	import CapacityChart from './components/CapacityChart.svelte';
	import IntensityChart from './components/IntensityChart.svelte';
	import Table from './components/Table.svelte';
	import ScenarioDescription from './components/ScenarioDescription.svelte';
	import ScenarioSparklines from './components/ScenarioSparklines.svelte';
	import filtersStore from './stores/filters';
	import dataVizStore from './stores/data-viz';
	import { fetchTechnologyViewData } from './page-data-options/fetch';
	import {
		processGenerationData,
		processCapacityData,
		processEmissionsData,
		processIntensityData
	} from './page-data-options/process-technology';

	export let data;
	const { articles, filters } = data;

	setContext('scenario-filters', filtersStore());

	const dataVizStoreNames = [
		'energy-data-viz',
		'capacity-data-viz',
		'emissions-data-viz',
		'intensity-data-viz'
	];
	dataVizStoreNames.forEach((name) => {
		setContext(name, dataVizStore());
	});

	const {
		isTechnologyViewSection,
		selectedRegion,
		selectedDataType,
		singleSelectionData,
		selectedFuelTechGroup,
		multiSelectionData
	} = getContext('scenario-filters');

	const dataVizStores = dataVizStoreNames.reduce(
		/**
		 * @param {Object.<string, *>} acc
		 * @param {string} name
		 */ (acc, name) => {
			acc[name] = getContext(name);
			return acc;
		},
		{}
	);

	/** @type {string[] | undefined} */
	let seriesLoadsIds = [];

	$: console.log(articles, filters);

	$: if ($isTechnologyViewSection) {
		fetchTechnologyViewData({
			model: $singleSelectionData.model,
			scenario: $singleSelectionData.scenario,
			pathway: $singleSelectionData.pathway,
			region: $selectedRegion,
			dataType: $selectedDataType
		}).then(
			({
				projectionEnergyData,
				projectionCapacityData,
				projectionEmissionsData,
				historyEnergyData,
				historyCapacityData,
				historyEmisssionsData
			}) => {
				const processedEnergy = processGenerationData({
					projection: projectionEnergyData,
					history: historyEnergyData,
					group: $selectedFuelTechGroup,
					colourReducer: $colourReducer
				});

				seriesLoadsIds = processedEnergy.seriesLoadsIds;

				const processedEmissions = processEmissionsData({
					projection: projectionEmissionsData,
					history: historyEmisssionsData
				});

				const processedCapacity = processCapacityData({
					projection: projectionCapacityData,
					history: historyCapacityData,
					group: $selectedFuelTechGroup,
					colourReducer: $colourReducer
				});

				const processedIntensity = processIntensityData({
					processedEmissions,
					processedEnergy
				});

				dataVizStoreNames.forEach((name) => {
					const store = dataVizStores[name];
					switch (name) {
						case 'energy-data-viz':
							updateDataVizStore(store, processedEnergy);
							break;
						case 'capacity-data-viz':
							updateDataVizStore(store, processedCapacity);
							break;
						case 'emissions-data-viz':
							updateDataVizStore(store, processedEmissions);
							break;
						case 'intensity-data-viz':
							updateDataVizStore(store, processedIntensity);
							break;
					}
				});
			}
		);
	}

	/**
	 * @param {*} store
	 * @param {ProcessedDataViz} p
	 */
	function updateDataVizStore(store, p) {
		store.seriesData.set(p.seriesData);
		store.seriesNames.set(p.seriesNames);
		store.seriesColours.set(p.seriesColours);
		store.seriesLabels.set(p.seriesLabels);
		store.nameOptions.set(p.nameOptions);
		store.yDomain.set(p.yDomain);
		store.chartType.set(p.chartType);
	}

	/**
	 * @param {string | undefined} hoverKey
	 * @param {TimeSeriesData | undefined} hoverData
	 */
	function updateStoreHover(hoverKey, hoverData) {
		dataVizStoreNames.forEach((name) => {
			const store = dataVizStores[name];
			store.hoverTime.set(hoverData ? hoverData.time : undefined);
			store.hoverKey.set(hoverKey);
		});
	}

	const handleMousemove = (/** @type {*} */ e) => {
		if (e.detail?.key) {
			updateStoreHover(e.detail.key, e.detail.data);
		} else {
			updateStoreHover(undefined, e.detail);
		}
	};

	const handleMouseout = () => {
		updateStoreHover(undefined, undefined);
	};
</script>

<Filters />

<div class="max-w-none p-12 flex gap-12">
	<div class="w-full">
		<h5>Generation (GWh)</h5>
		<EnergyChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />

		<!-- <div class="grid grid-cols-2 gap-12">
			
		</div> -->

		<div>
			<h5>Emissions (tCO2e)</h5>
			<EmissionsChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />
		</div>

		<div>
			<h5>Intensity (kgCO2e/MWh)</h5>
			<IntensityChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />
		</div>

		<h5>Capacity (MW)</h5>
		<CapacityChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />
	</div>

	<div class="w-[40%]">
		<Table {seriesLoadsIds} />
	</div>
</div>

<div class="container max-w-none lg:container px-6 mx-auto md:grid grid-cols-2">
	<div class="relative h-auto">
		<ScenarioDescription />
	</div>

	<ScenarioSparklines />
</div>

<ArticlesSection
	analysisArticles={articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	)}
/>
