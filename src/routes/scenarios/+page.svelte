<script>
	import { setContext, getContext, onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import { colourReducer } from '$lib/stores/theme';

	import LogoMark from '$lib/images/logo-mark.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import Meta from '$lib/components/Meta.svelte';

	import ArticlesSection from './components/ArticlesSection.svelte';
	import Filters from './components/Filters.svelte';
	import ScenarioChart from './components/ScenarioChart.svelte';
	import TableTechnology from './components/TableTechnology.svelte';
	import TableScenario from './components/TableScenario.svelte';
	import TableRegion from './components/TableRegion.svelte';
	import DetailedTechnology from './components/DetailedTechnology.svelte';
	import DetailedScenario from './components/DetailedScenario.svelte';
	import DetailedRegion from './components/DetailedRegion.svelte';

	import filtersStore from './stores/filters';
	import dataVizStore from './stores/data-viz';
	import { regionOptions } from './page-data-options/regions';
	// import { groupOptions as scenarioGroups } from './page-data-options/groups-scenario';
	// import { groupOptions as regionGroups } from './page-data-options/groups-region';

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
		{
			name: 'energy-data-viz',
			chart: 'generation'
		},
		{
			name: 'emissions-data-viz',
			chart: 'emissions'
		},
		{
			name: 'intensity-data-viz',
			chart: 'intensity'
		},
		{
			name: 'capacity-data-viz',
			chart: 'capacity'
		}
	];
	dataVizStoreNames.forEach(({ name }) => {
		setContext(name, dataVizStore());
	});

	const {
		isTechnologyViewSection,
		isScenarioViewSection,
		isRegionViewSection,
		selectedRegion,
		selectedDataType,
		selectedCharts,
		singleSelectionData,
		selectedFuelTechGroup,
		multiSelectionData,
		includeBatteryAndLoads,
		showScenarioOptions
	} = getContext('scenario-filters');

	const dataVizStores = dataVizStoreNames.reduce(
		/**
		 * @param {Object.<string, *>} acc
		 * @param {{name: string}} curr
		 */ (acc, curr) => {
			acc[curr.name] = getContext(curr.name);
			return acc;
		},
		{}
	);

	const { focusTime: energyFocusTime } = dataVizStores['energy-data-viz'];

	/** @type {FuelTechCode[] | undefined} */
	let seriesLoadsIds = [];

	/** @type {string[]} */
	let hiddenRowNames = [];

	let fetching = false;
	$: console.log(articles, filters);

	$: if ($isTechnologyViewSection) {
		fetching = true;

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
					colourReducer: $colourReducer,
					includeBatteryAndLoads: $includeBatteryAndLoads
				});

				seriesLoadsIds = processedEnergy.seriesLoadsIds;

				const processedEmissions =
					projectionEmissionsData.length > 0
						? processTechnology.emissions({
								projection: projectionEmissionsData,
								history: historyEmisssionsData,
								includeBatteryAndLoads: $includeBatteryAndLoads
						  })
						: undefined;

				const processedCapacity = processTechnology.capacity({
					projection: projectionCapacityData,
					history: historyCapacityData,
					group: $selectedFuelTechGroup,
					colourReducer: $colourReducer,
					includeBatteryAndLoads: $includeBatteryAndLoads
				});

				const processedIntensity = processedEmissions
					? processTechnology.intensity({
							processedEmissions,
							processedEnergy
					  })
					: undefined;

				updateAllStores({
					processedEnergy,
					processedCapacity,
					processedEmissions,
					processedIntensity
				});

				fetching = false;
			}
		);
	}

	$: if ($isScenarioViewSection) {
		fetching = true;

		fetchScenarioViewData({ scenarios: $multiSelectionData, region: $selectedRegion }).then(
			({ projectionsData, historyEnergyData, historyEmisssionsData, historyCapacityData }) => {
				const processedEnergy = processScenario.generation({
					projections: projectionsData,
					history: historyEnergyData,
					// group: $selectedFuelTechGroup,
					includeBatteryAndLoads: $includeBatteryAndLoads
				});

				const processedCapacity = processScenario.capacity({
					projections: projectionsData,
					history: historyCapacityData,
					// group: $selectedFuelTechGroup,
					includeBatteryAndLoads: $includeBatteryAndLoads
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

				updateAllStores({
					processedEnergy,
					processedCapacity,
					processedEmissions,
					processedIntensity
				});

				fetching = false;
			}
		);
	}

	$: if ($isRegionViewSection) {
		fetching = true;

		const regionsOnly = regionOptions.filter((r) => r.value !== '_all');

		fetchRegionViewData({
			regions: regionsOnly,
			model: $singleSelectionData.model,
			scenario: $singleSelectionData.scenario,
			pathway: $singleSelectionData.pathway
		}).then((regionsData) => {
			const processedEnergy = processRegion.generation({
				regionsData,
				// group: $selectedFuelTechGroup,
				includeBatteryAndLoads: $includeBatteryAndLoads
			});

			console.log('processedEnergy', processedEnergy);

			const processedCapacity = processRegion.capacity({
				regionsData,
				// group: $selectedFuelTechGroup,
				includeBatteryAndLoads: $includeBatteryAndLoads
			});

			// console.log('processedCapacity', processedCapacity);

			const processedEmissions = processRegion.emissions({
				regionsData,
				includeBatteryAndLoads: $includeBatteryAndLoads
			});

			// console.log('processedEmissions', processedEmissions);

			const processedIntensity = processedEmissions
				? processRegion.intensity({
						processedEmissions,
						processedEnergy
				  })
				: undefined;

			// console.log('processedIntensity', processedIntensity);

			updateAllStores({
				processedEnergy,
				processedCapacity,
				processedEmissions,
				processedIntensity
			});

			fetching = false;
		});
	}

	/**
	 *
	 * @param {{
	 * 		processedEnergy: ProcessedDataViz,
	 * 		processedCapacity: ProcessedDataViz,
	 * 		processedEmissions: ProcessedDataViz | undefined,
	 * 		processedIntensity: ProcessedDataViz | undefined
	 * }} param0
	 */
	function updateAllStores({
		processedEnergy,
		processedCapacity,
		processedEmissions,
		processedIntensity
	}) {
		dataVizStoreNames.forEach(({ name }) => {
			const store = dataVizStores[name];
			switch (name) {
				case 'energy-data-viz':
					updateDataVizStore('Generation', store, processedEnergy, 'h-[400px] md:h-[450px]');
					break;
				case 'capacity-data-viz':
					updateDataVizStore('Capacity', store, processedCapacity, 'h-[400px] md:h-[450px]');
					break;
				case 'emissions-data-viz':
					processedEmissions
						? updateDataVizStore('Emissions', store, processedEmissions)
						: store.reset();
					break;
				case 'intensity-data-viz':
					processedIntensity
						? updateDataVizStore('Intensity', store, processedIntensity)
						: store.reset();
					break;
			}
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
		store.baseUnit.set(p.baseUnit);
		store.prefix.set(p.prefix);
		store.displayPrefix.set(p.displayPrefix);
		store.allowedPrefixes.set(p.allowedPrefixes);
	}

	/**
	 * @param {string | undefined} hoverKey
	 * @param {TimeSeriesData | undefined} hoverData
	 */
	function updateStoreHover(hoverKey, hoverData) {
		dataVizStoreNames.forEach(({ name }) => {
			const store = dataVizStores[name];
			store.hoverTime.set(hoverData ? hoverData.time : undefined);
			store.hoverKey.set(hoverKey);
		});
	}

	/**
	 * @param {CustomEvent<{ data: TimeSeriesData, key: string }> | CustomEvent<TimeSeriesData>} evt
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
	 * @param {CustomEvent<TimeSeriesData>} evt
	 */
	function handlePointerup(evt) {
		const focusTime = evt.detail?.time;
		const isSame = focusTime ? $energyFocusTime === focusTime : false;
		const time = isSame ? undefined : focusTime;

		dataVizStoreNames.forEach(({ name }) => {
			const store = dataVizStores[name];
			store.focusTime.set(time);
		});
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

	function setDefaultFocusTime() {
		// set 2030 as the default focus time
		dataVizStoreNames.forEach(({ name }) => {
			const store = dataVizStores[name];
			store.focusTime.set(1893416400000);
		});
	}

	onMount(() => {
		setTimeout(() => {
			setDefaultFocusTime();
		}, 1500);
	});
</script>

<!-- TODO: Update preview image -->
<Meta
	title="Scenarios"
	description="Explore the future of Australia's national electricity market."
	image="/img/preview.jpg"
/>

<PageHeaderSimple>
	<div slot="main-heading">
		<h1 class="tracking-widest text-center">Scenario Explorer</h1>
	</div>
	<div slot="sub-heading">
		<p class="text-sm text-center w-full md:w-[556px] mx-auto">
			These scenarios aim to steer Australia towards a cost-effective, reliable and safe energy
			system en route to a zero-emissions electricity network.
		</p>
	</div>
</PageHeaderSimple>

<Filters />

<!-- WORKAROUND: class:relative={!$showScenarioOptions} to allow Pathway dropdown to layer above -->
<div
	class="max-w-none py-10 md:p-16 md:flex gap-12 z-30 border-b border-mid-warm-grey pb-24 mb-24"
	class:relative={!$showScenarioOptions}
>
	{#if fetching}
		<div
			class="h-screen bg-light-warm-grey flex justify-center items-center"
			transition:fade={{ duration: 250 }}
		>
			<LogoMark />
		</div>
	{/if}
	<section class="w-full flex flex-col gap-12 md:w-[60%]">
		{#each dataVizStoreNames as { name, chart }}
			{#if $selectedCharts.includes(chart)}
				<ScenarioChart
					store={dataVizStores[name]}
					{hiddenRowNames}
					{seriesLoadsIds}
					on:mousemove={handleMousemove}
					on:mouseout={handleMouseout}
					on:pointerup={handlePointerup}
				/>
			{/if}
		{/each}

		<!-- {#if fetching}
			<div
				class="h-screen bg-light-warm-grey flex justify-center items-center"
				transition:fade={{ duration: 250 }}
			>
				<LogoMark />
			</div>
		{:else}
			{#each dataVizStoreNames as { name, chart }}
				{#if $selectedCharts.includes(chart)}
					<ScenarioChart
						store={dataVizStores[name]}
						{hiddenRowNames}
						on:mousemove={handleMousemove}
						on:mouseout={handleMouseout}
						on:pointerup={handlePointerup}
					/>
				{/if}
			{/each}
		{/if} -->
	</section>

	{#if $isTechnologyViewSection}
		<section class="md:w-[40%]">
			<TableTechnology {seriesLoadsIds} {hiddenRowNames} on:row-click={toggleRow} />
		</section>
	{/if}
	{#if $isScenarioViewSection}
		<section class="md:w-[40%]">
			<TableScenario title="Scenario" {hiddenRowNames} on:row-click={toggleRow} />
		</section>
	{/if}
	{#if $isRegionViewSection}
		<section class="md:w-[40%]">
			<TableRegion title="Region" {seriesLoadsIds} {hiddenRowNames} on:row-click={toggleRow} />
		</section>
	{/if}
</div>

<div class="container max-w-none lg:container md:grid grid-cols-2">
	{#if $isTechnologyViewSection}
		<DetailedTechnology
			{seriesLoadsIds}
			on:mousemove={handleMousemove}
			on:mouseout={handleMouseout}
			on:pointerup={handlePointerup}
		/>
	{/if}
	{#if $isScenarioViewSection}
		<DetailedScenario
			on:mousemove={handleMousemove}
			on:mouseout={handleMouseout}
			on:pointerup={handlePointerup}
		/>
	{/if}

	{#if $isRegionViewSection}
		<DetailedRegion
			on:mousemove={handleMousemove}
			on:mouseout={handleMouseout}
			on:pointerup={handlePointerup}
		/>
	{/if}
</div>

<ArticlesSection
	analysisArticles={articles.filter(
		(article) => article.tags && article.tags.find((tag) => tag.title === 'ISP')
	)}
/>
