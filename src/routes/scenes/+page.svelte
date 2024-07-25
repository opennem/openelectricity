<script>
	import { setContext, getContext } from 'svelte';

	import { colourReducer } from '$lib/stores/theme';

	import ArticlesSection from './components/ArticlesSection.svelte';
	import Filters from './components/Filters.svelte';
	import EnergyChart from './components/EnergyChart.svelte';
	import CapacityChart from './components/CapacityChart.svelte';
	import filtersStore from './stores/filters';
	import dataVizStore from './stores/data-viz';
	import { fetchTechnologyViewData } from './page-data-options/fetch';
	import { processTechnologyData } from './page-data-options/process';

	export let data;
	const { articles, filters } = data;

	setContext('scenario-filters', filtersStore());
	setContext('energy-data-viz', dataVizStore());
	setContext('capacity-data-viz', dataVizStore());

	const {
		isTechnologyViewSection,
		selectedRegion,
		selectedDataType,
		singleSelectionData,
		selectedFuelTechGroup,
		multiSelectionData
	} = getContext('scenario-filters');
	const energyDataVizStore = getContext('energy-data-viz');
	const capacityDataVizStore = getContext('capacity-data-viz');

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
				const processed = processTechnologyData({
					projection: projectionEnergyData,
					history: historyEnergyData,
					group: $selectedFuelTechGroup,
					dataType: 'energy',
					colourReducer: $colourReducer
				});

				const processedCapacity = processTechnologyData({
					projection: projectionCapacityData,
					history: historyCapacityData,
					group: $selectedFuelTechGroup,
					dataType: 'capacity',
					colourReducer: $colourReducer
				});

				if (processed) {
					updateDataVizStore(energyDataVizStore, processed);
				}

				if (processedCapacity) {
					updateDataVizStore(capacityDataVizStore, processedCapacity);
				}
			}
		);
	}

	/**
	 * @param {*} store
	 * @param {{
	 * seriesData: TimeSeriesData[],
	 * seriesNames: string[],
	 * seriesColours: Object.<string, string>,
	 * seriesLabels: Object.<string, string>,
	 * nameOptions: { label: string, value: string }[],
	 * yDomain: number[]
	 * }} p
	 */
	function updateDataVizStore(store, p) {
		store.seriesData.set(p.seriesData);
		store.seriesNames.set(p.seriesNames);
		store.seriesColours.set(p.seriesColours);
		store.seriesLabels.set(p.seriesLabels);
		store.nameOptions.set(p.nameOptions);
		store.yDomain.set(p.yDomain);
	}
</script>

<Filters />

<h3>Generation</h3>
<EnergyChart />

<h3>Capacity</h3>
<CapacityChart />

<ArticlesSection
	analysisArticles={articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	)}
/>
