<script>
	import { setContext, getContext } from 'svelte';

	import { colourReducer } from '$lib/stores/theme';

	import ArticlesSection from './components/ArticlesSection.svelte';
	import Filters from './components/Filters.svelte';
	import ScenarioChart from './components/ScenarioChart.svelte';
	import TableTechnology from './components/TableTechnology.svelte';
	import TableScenario from './components/TableScenario.svelte';
	import ScenarioDetailed from './components/ScenarioDetailed.svelte';
	import filtersStore from './stores/filters';
	import dataVizStore from './stores/data-viz';
	import { regionOptions } from './page-data-options/regions';
	import { groupOptions as scenarioGroups } from './page-data-options/groups-scenario';
	import { groupOptions as regionGroups } from './page-data-options/groups-region';

	import {
		fetchTechnologyViewData,
		fetchScenarioViewData,
		fetchRegionViewData
	} from './page-data-options/fetch';
	import processTechnology from './page-data-options/process-technology';
	import processScenario from './page-data-options/process-scenario';
	import processRegion from './page-data-options/process-region';

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
		isScenarioViewSection,
		isRegionViewSection,
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

	/** @type {string[]} */
	let hiddenRowNames = [];

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
				const processedEnergy = processTechnology.generation({
					projection: projectionEnergyData,
					history: historyEnergyData,
					group: $selectedFuelTechGroup,
					colourReducer: $colourReducer
				});

				seriesLoadsIds = processedEnergy.seriesLoadsIds;

				const processedEmissions =
					projectionEmissionsData.length > 0
						? processTechnology.emissions({
								projection: projectionEmissionsData,
								history: historyEmisssionsData
						  })
						: undefined;

				const processedCapacity = processTechnology.capacity({
					projection: projectionCapacityData,
					history: historyCapacityData,
					group: $selectedFuelTechGroup,
					colourReducer: $colourReducer
				});

				const processedIntensity = processedEmissions
					? processTechnology.intensity({
							processedEmissions,
							processedEnergy
					  })
					: undefined;

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
							processedEmissions
								? updateDataVizStore('Emissions (tCO2e)', store, processedEmissions)
								: store.reset();
							break;
						case 'intensity-data-viz':
							processedIntensity
								? updateDataVizStore('Intensity (kgCO2e/MWh)', store, processedIntensity)
								: store.reset();
							break;
					}
				});
			}
		);
	}

	$: if ($isScenarioViewSection) {
		fetchScenarioViewData({ scenarios: $multiSelectionData, region: $selectedRegion }).then(
			({ projectionsData, historyEnergyData, historyEmisssionsData, historyCapacityData }) => {
				const processedEnergy = processScenario.generation({
					projections: projectionsData,
					history: historyEnergyData,
					group: $selectedFuelTechGroup
				});

				const processedCapacity = processScenario.capacity({
					projections: projectionsData,
					history: historyCapacityData,
					group: $selectedFuelTechGroup
				});

				const processedEmissions = processScenario.emissions({
					projections: projectionsData,
					history: historyEmisssionsData,
					group: $selectedFuelTechGroup
				});

				const processedIntensity = processedEmissions
					? processScenario.intensity({
							processedEmissions,
							processedEnergy
					  })
					: undefined;

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
							processedEmissions
								? updateDataVizStore('Emissions (tCO2e)', store, processedEmissions)
								: store.reset();
							break;

						case 'intensity-data-viz':
							processedIntensity
								? updateDataVizStore('Intensity (kgCO2e/MWh)', store, processedIntensity)
								: store.reset();
							break;
					}
				});
			}
		);
	}

	$: if ($isRegionViewSection) {
		console.log('region view');

		const regionsOnly = regionOptions.filter((r) => r.value !== '_all');

		fetchRegionViewData({
			regions: regionsOnly,
			model: $singleSelectionData.model,
			scenario: $singleSelectionData.scenario,
			pathway: $singleSelectionData.pathway
		}).then((regionsData) => {
			const processedEnergy = processRegion.generation({
				regionsData,
				group: $selectedFuelTechGroup
			});

			console.log('processedEnergy', processedEnergy);

			const processedCapacity = processRegion.capacity({
				regionsData,
				group: $selectedFuelTechGroup
			});

			console.log('processedCapacity', processedCapacity);

			const processedEmissions = processRegion.emissions({
				regionsData,
				group: $selectedFuelTechGroup
			});

			console.log('processedEmissions', processedEmissions);

			const processedIntensity = processedEmissions
				? processRegion.intensity({
						processedEmissions,
						processedEnergy
				  })
				: undefined;

			console.log('processedIntensity', processedIntensity);

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
						updateDataVizStore('Capacity (MW)', store, processedCapacity, 'h-[400px] md:h-[450px]');
						break;
					case 'emissions-data-viz':
						processedEmissions
							? updateDataVizStore('Emissions (tCO2e)', store, processedEmissions)
							: store.reset();
						break;
					case 'intensity-data-viz':
						processedIntensity
							? updateDataVizStore('Intensity (kgCO2e/MWh)', store, processedIntensity)
							: store.reset();
						break;
				}
			});
		});
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

	/**
	 * @param {*} evt
	 */
	function handleMousemove(evt) {
		if (evt.detail?.key) {
			updateStoreHover(evt.detail.key, evt.detail.data);
		} else {
			updateStoreHover(undefined, evt.detail);
		}
	}
	function handleMouseout() {
		updateStoreHover(undefined, undefined);
	}

	/**
	 * @param {CustomEvent<{ name: string, isMetaPressed: boolean, allNames: string[] }>} evt
	 */
	function toggleRow(evt) {
		const name = evt.detail.name;
		const isMetaPressed = evt.detail.isMetaPressed;
		const allNames = evt.detail.allNames;

		if (isMetaPressed) {
			hiddenRowNames = allNames.filter((n) => n !== name);
		} else {
			if (hiddenRowNames.includes(name)) {
				hiddenRowNames = hiddenRowNames.filter((n) => n !== name);
			} else {
				hiddenRowNames = [...hiddenRowNames, name];

				if (hiddenRowNames.length === allNames.length) {
					hiddenRowNames = [];
				}
			}
		}
	}
</script>

<Filters />

<div class="max-w-none p-12 flex gap-12">
	<div class="w-[50%]">
		{#each dataVizStoreNames as name}
			<ScenarioChart
				store={dataVizStores[name]}
				{hiddenRowNames}
				on:mousemove={handleMousemove}
				on:mouseout={handleMouseout}
			/>
		{/each}
	</div>

	<div class="w-[50%]">
		{#if $isTechnologyViewSection}
			<TableTechnology {seriesLoadsIds} {hiddenRowNames} on:row-click={toggleRow} />
		{/if}
		{#if $isScenarioViewSection}
			<TableScenario
				groupOptions={scenarioGroups}
				{seriesLoadsIds}
				{hiddenRowNames}
				on:row-click={toggleRow}
			/>
		{/if}
		{#if $isRegionViewSection}
			<TableScenario
				groupOptions={regionGroups}
				{seriesLoadsIds}
				{hiddenRowNames}
				on:row-click={toggleRow}
			/>
		{/if}
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
