<script>
	import { getContext } from 'svelte';
	import Switch from '$lib/components/Switch.svelte';

	import { modelLabelMap } from '../page-data-options/models';
	import ScenarioDescription from './ScenarioDescription.svelte';
	import MiniCharts from './MiniCharts.svelte';

	/** @type {Object.<string, *>} */
	const dataVizStores = {
		energyDataVizStore: getContext('energy-data-viz'),
		emissionsDataVizStore: getContext('emissions-data-viz'),
		capacityDataVizStore: getContext('capacity-data-viz'),
		intensityDataVizStore: getContext('intensity-data-viz')
	};
	const { multiSelectionData } = getContext('scenario-filters');

	const stores = [
		{ value: 'energyDataVizStore', label: 'Generation' },
		{ value: 'emissionsDataVizStore', label: 'Emissions' },
		{ value: 'capacityDataVizStore', label: 'Capacity' }
	];

	let selectedStoreName = 'energyDataVizStore';
	let selectedScenarioId = '';

	$: if (!selectedScenarioId) {
		selectedScenarioId = $multiSelectionData[0].id;
	}

	$: selectedScenario = $multiSelectionData.find((d) => d.id === selectedScenarioId);

	$: isEmissionsView = selectedStoreName === 'emissionsDataVizStore';

	$: selectedStore = dataVizStores[selectedStoreName];
	$: seriesNames = selectedStore.seriesNames;
	$: seriesLabels = selectedStore.seriesLabels;
	$: seriesColours = selectedStore.seriesColours;
	$: xTicks = selectedStore.miniXTicks;
	$: formatTickX = selectedStore.formatTickX;
	$: formatTickY = selectedStore.convertAndFormatValue;
	$: chartOverlay = selectedStore.chartOverlay;
	$: chartOverlayLine = selectedStore.chartOverlayLine;
	$: chartOverlayHatchStroke = selectedStore.chartOverlayHatchStroke;
	// $: hoverData = selectedStore.hoverData;
	// $: focusData = selectedStore.focusData;
	$: hoverTime = selectedStore.hoverTime;
	$: focusTime = selectedStore.focusTime;
	$: seriesData = selectedStore.seriesData;
	$: displayUnit = selectedStore.displayUnit;

	$: intensityStore = dataVizStores.intensityDataVizStore;
	$: intensitySeriesNames = intensityStore.seriesNames;
	$: intensityFormatTickY = intensityStore.convertAndFormatValue;
	$: intensitySeriesLabels = intensityStore.seriesLabels;
	$: intensitySeriesColours = intensityStore.seriesColours;
	$: intensityHoverData = intensityStore.hoverData;
	$: intensityFocusData = intensityStore.focusData;
	$: intensityHoverTime = intensityStore.hoverTime;
	$: intensityFocusTime = intensityStore.focusTime;
	$: intensitySeriesData = intensityStore.seriesData;
	$: intensityDisplayUnit = intensityStore.displayUnit;

	$: selectedModels = [...new Set($multiSelectionData.map((d) => d.model))].map((d) => {
		const scenarios = $multiSelectionData.filter((e) => e.model === d);
		return {
			model: d,
			scenarios
		};
	});

	$: seriesPathways = $multiSelectionData.reduce((acc, d) => {
		acc[d.id] = d.pathway;
		return acc;
	}, {});

	/** @type {TimeSeriesData[]} */
	let mergedSeriesData = [];
	$: seriesNamesWithoutHistorical = $seriesNames.filter(
		(/** @type {string} */ name) => name !== 'historical'
	);
	$: {
		mergedSeriesData = $seriesData.map((/** @type {TimeSeriesData} */ d) => {
			const obj = {
				...d
			};

			seriesNamesWithoutHistorical.forEach((/** @type {string} */ name) => {
				const value = /** @type {number} */ (d[name]);
				if (!value) {
					obj[name] = d['historical'];
				}
			});

			return obj;
		});
	}
	$: hoverData = mergedSeriesData.find((d) => d.time === $hoverTime);
	$: focusData = mergedSeriesData.find((d) => d.time === $focusTime);

	/** @type {TimeSeriesData[]} */
	let mergedIntensityData = [];
	$: intensitySeriesNamesWithoutHistorical = $intensitySeriesNames.filter(
		(/** @type {string} */ name) => name !== 'historical'
	);
	$: {
		mergedIntensityData = $intensitySeriesData.map((/** @type {TimeSeriesData} */ d) => {
			const obj = {
				...d
			};

			intensitySeriesNamesWithoutHistorical.forEach((/** @type {string} */ name) => {
				if (!d[name]) {
					obj[name] = d['historical'];
				}
			});

			return obj;
		});
	}

	// $: console.log('hoverData', hoverData);
</script>

<div class="px-10 md:px-0">
	<ScenarioDescription model={selectedScenario.model} scenario={selectedScenario.scenario} />
</div>

<section class="px-5 md:px-0">
	<div class="flex justify-center mb-12">
		<Switch
			buttons={stores}
			selected={selectedStoreName}
			on:change={(evt) => (selectedStoreName = evt.detail.value)}
			class="justify-center"
		/>
	</div>

	{#each selectedModels as { model, scenarios }, i}
		{@const names = scenarios.map((d) => d.id).reverse()}

		<section class="mb-12">
			<h6 class="font-space text-mid-grey pl-5 md:pl-0">{modelLabelMap[model]}</h6>

			{#if isEmissionsView}
				<div class="grid grid-cols-2 gap-3">
					<MiniCharts
						isButton={true}
						{selectedScenarioId}
						seriesNames={names}
						seriesLabels={$seriesLabels}
						seriesColours={$seriesColours}
						{seriesPathways}
						xTicks={$xTicks}
						formatTickX={$formatTickX}
						formatTickY={$formatTickY}
						chartOverlay={$chartOverlay}
						chartOverlayLine={$chartOverlayLine}
						chartOverlayHatchStroke={$chartOverlayHatchStroke}
						{hoverData}
						{focusData}
						seriesData={mergedSeriesData}
						displayUnit={$displayUnit}
						gridColClass="grid-cols-1"
						on:mousemove
						on:mouseout
						on:pointerup
						on:scenario-click={(evt) => (selectedScenarioId = evt.detail.key)}
					/>
					<MiniCharts
						isButton={true}
						{selectedScenarioId}
						seriesNames={names}
						seriesLabels={$intensitySeriesLabels}
						seriesColours={$intensitySeriesColours}
						{seriesPathways}
						xTicks={$xTicks}
						formatTickX={$formatTickX}
						formatTickY={$intensityFormatTickY}
						chartOverlay={$chartOverlay}
						chartOverlayLine={$chartOverlayLine}
						chartOverlayHatchStroke={$chartOverlayHatchStroke}
						hoverData={$intensityHoverData}
						focusData={$intensityFocusData}
						seriesData={mergedIntensityData}
						displayUnit={$intensityDisplayUnit}
						showArea={false}
						gridColClass="grid-cols-1"
						on:mousemove
						on:mouseout
						on:pointerup
						on:scenario-click={(evt) => (selectedScenarioId = evt.detail.key)}
					/>
				</div>
			{:else}
				<MiniCharts
					isButton={true}
					{selectedScenarioId}
					seriesNames={names}
					seriesLabels={$seriesLabels}
					seriesColours={$seriesColours}
					{seriesPathways}
					xTicks={$xTicks}
					formatTickX={$formatTickX}
					formatTickY={$formatTickY}
					chartOverlay={$chartOverlay}
					chartOverlayLine={$chartOverlayLine}
					chartOverlayHatchStroke={$chartOverlayHatchStroke}
					{hoverData}
					{focusData}
					seriesData={mergedSeriesData}
					displayUnit={$displayUnit}
					on:mousemove
					on:mouseout
					on:pointerup
					on:scenario-click={(evt) => (selectedScenarioId = evt.detail.key)}
				/>
			{/if}
		</section>
	{/each}
</section>
