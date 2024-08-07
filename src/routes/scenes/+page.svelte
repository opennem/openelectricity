<script>
	import { setContext, getContext } from 'svelte';

	import { colourReducer } from '$lib/stores/theme';

	import ArticlesSection from './components/ArticlesSection.svelte';
	import Filters from './components/Filters.svelte';
	import ScenarioChart from './components/ScenarioChart.svelte';
	import Table from './components/Table.svelte';
	import ScenarioDetailed from './components/ScenarioDetailed.svelte';
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
		'emissions-data-viz',
		'intensity-data-viz',
		'capacity-data-viz'
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
							updateDataVizStore(
								'Generation (GWh)',
								store,
								processedEnergy,
								'h-[400px] md:h-[450px]'
							);
							break;
						case 'capacity-data-viz':
							updateDataVizStore(
								'Capacity (MW)',
								store,
								processedCapacity,
								'h-[400px] md:h-[450px]'
							);
							break;
						case 'emissions-data-viz':
							updateDataVizStore('Emissions (tCO2e)', store, processedEmissions);
							break;
						case 'intensity-data-viz':
							updateDataVizStore('Intensity (kgCO2e/MWh)', store, processedIntensity);
							break;
					}
				});
			}
		);
	}

	/**
	 * @param {string} title
	 * @param {*} store
	 * @param {ProcessedDataViz} p
	 * @param {string} [chartHeightClasses]
	 */
	function updateDataVizStore(title, store, p, chartHeightClasses) {
		store.title.set(title);
		store.seriesData.set(p.seriesData);
		store.seriesNames.set(p.seriesNames);
		store.seriesColours.set(p.seriesColours);
		store.seriesLabels.set(p.seriesLabels);
		store.nameOptions.set(p.nameOptions);
		store.yDomain.set(p.yDomain);
		store.chartType.set(p.chartType);
		store.chartHeightClasses.set(chartHeightClasses);
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
		{#each dataVizStoreNames as name}
			<ScenarioChart
				store={dataVizStores[name]}
				on:mousemove={handleMousemove}
				on:mouseout={handleMouseout}
			/>
		{/each}
	</div>

	<div class="w-[40%]">
		<Table {seriesLoadsIds} />
	</div>
</div>

<div class="container max-w-none lg:container px-6 mx-auto md:grid grid-cols-2">
	<ScenarioDetailed on:mousemove={handleMousemove} on:mouseout={handleMouseout} />
</div>

<ArticlesSection
	analysisArticles={articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	)}
/>
