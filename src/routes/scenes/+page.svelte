<script>
	import { setContext, getContext } from 'svelte';

	import { colourReducer } from '$lib/stores/theme';

	import ArticlesSection from './components/ArticlesSection.svelte';
	import Filters from './components/Filters.svelte';
	import EnergyChart from './components/EnergyChart.svelte';
	import EmissionsChart from './components/EmissionsChart.svelte';
	import CapacityChart from './components/CapacityChart.svelte';
	import IntensityChart from './components/IntensityChart.svelte';
	import filtersStore from './stores/filters';
	import dataVizStore from './stores/data-viz';
	import { fetchTechnologyViewData } from './page-data-options/fetch';
	import { processTechnologyData, processEmissionsData } from './page-data-options/process';

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

	console.log('dataVizStores', dataVizStores);

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	/** @type {string | undefined} */
	let hoverKey;

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
				const processedEnergy = processTechnologyData({
					projection: projectionEnergyData,
					history: historyEnergyData,
					group: $selectedFuelTechGroup,
					dataType: 'energy',
					colourReducer: $colourReducer
				});

				const processedEmissions = processEmissionsData({
					projection: projectionEmissionsData,
					history: historyEmisssionsData
				});

				const processedCapacity = processTechnologyData({
					projection: projectionCapacityData,
					history: historyCapacityData,
					group: $selectedFuelTechGroup,
					dataType: 'capacity',
					colourReducer: $colourReducer
				});

				// calculate intensity
				// use net generaiton (_max) for intensity -
				// TODO: recalculate total generation - check opennem to see what fuel tech to include..
				const emissionsTotalData = processedEmissions.seriesData;
				const generationsNetTotalData = processedEnergy.seriesData.map((d) => {
					return {
						time: d.time,
						date: d.date,
						'au.net_generation.total': d._max
					};
				});
				const intensityData = emissionsTotalData.map((d, i) => {
					return {
						time: d.time,
						date: d.date,
						'au.emission_intensity':
							d['au.emissions.total'] / generationsNetTotalData[i]['au.net_generation.total']
					};
				});

				// console.log('emissionsTotalData', emissionsTotalData);
				// console.log('generationsNetTotalData', generationsNetTotalData);
				// console.log('intensityData', intensityData, processedEmissions);

				const processedEmissionIntensity = {
					seriesData: intensityData,
					seriesNames: ['au.emission_intensity'],
					seriesColours: { 'au.emission_intensity': '#000' },
					seriesLabels: { 'au.emission_intensity': 'Emission Intensity' },
					nameOptions: [{ label: 'Emission Intensity', value: 'au.emission_intensity' }],
					yDomain: [0, 1600],
					chartType: /** @type {'area' | 'line'} */ ('line')
				};

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
							updateDataVizStore(store, processedEmissionIntensity);
							break;
					}
				});
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
	 * yDomain: number[],
	 * chartType?: 'area' | 'line'
	 * }} p
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

<h3>Generation</h3>
<EnergyChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />

<h3>Emissions</h3>
<EmissionsChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />

<h3>Intensity</h3>
<IntensityChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />

<h3>Capacity</h3>
<CapacityChart on:mousemove={handleMousemove} on:mouseout={handleMouseout} />

<ArticlesSection
	analysisArticles={articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	)}
/>
