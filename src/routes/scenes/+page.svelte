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
		<h3 class="font-light text-sm">Generation (GWh)</h3>
		<EnergyChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />

		<!-- <div class="grid grid-cols-2 gap-12">
			
		</div> -->

		<div>
			<h3 class="font-light text-sm">Emissions (tCO2e)</h3>
			<EmissionsChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />
		</div>

		<div>
			<h3 class="font-light text-sm">Intensity (kgCO2e/MWh)</h3>
			<IntensityChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />
		</div>

		<h3 class="font-light text-sm">Capacity (MW)</h3>
		<CapacityChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />
	</div>

	<div class="w-[40%]">
		<Table {seriesLoadsIds} />
	</div>
</div>

<ArticlesSection
	analysisArticles={articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	)}
/>
