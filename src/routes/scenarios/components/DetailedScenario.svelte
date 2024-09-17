<script>
	import { getContext } from 'svelte';
	import Switch from '$lib/components/Switch.svelte';

	import { modelLabelMap, scenarioLabelMap } from '../page-data-options/models';

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
	const { orderedModelScenarioPathways, isScenarioViewSection } = getContext('by-scenario');

	const stores = [
		{ value: 'energyDataVizStore', label: 'Generation' },
		{ value: 'emissionsDataVizStore', label: 'Emissions' },
		{ value: 'capacityDataVizStore', label: 'Capacity' }
	];

	let selectedStoreName = 'energyDataVizStore';
	let selectedScenarioId = '';
	let selectedScenarioPathwayId = '';

	$: if (!selectedScenarioId) {
		selectedScenarioId = $multiSelectionData[0].model + '-' + $multiSelectionData[0].scenario;
		selectedScenarioPathwayId = $multiSelectionData[0].id;
	}

	$: selectedScenario = $multiSelectionData.find(
		(d) => `${d.model}-${d.scenario}` === selectedScenarioId
	);

	$: isEmissionsView = selectedStoreName === 'emissionsDataVizStore';

	$: selectedStore = dataVizStores[selectedStoreName];
	$: seriesNames = selectedStore.seriesNames;
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
	$: intensitySeriesColours = intensityStore.seriesColours;
	$: intensityHoverData = intensityStore.hoverData;
	$: intensityFocusData = intensityStore.focusData;
	$: intensitySeriesData = intensityStore.seriesData;
	$: intensityDisplayUnit = intensityStore.displayUnit;

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

	/**
	 * @param {CustomEvent} evt
	 */
	function handleScenarioSelect(evt) {
		// key includes pathway, remove before assigning
		const keyArr = evt.detail.key.split('-');
		selectedScenarioId = keyArr[0] + '-' + keyArr[1];
		selectedScenarioPathwayId = evt.detail.key;
	}

	/**
	 * @param {string} model
	 * @param {*[]} scenarios
	 */
	function getNames(model, scenarios) {
		/** @type {string[]} */
		const names = [];
		scenarios.forEach((d) => {
			d.pathways.forEach((e) => {
				names.push(`${model}-${d.scenario}-${e}`);
			});
		});
		return names.reverse();
	}

	/**
	 * @param {string} model
	 * @param {*[]} scenarios
	 */
	function getLabels(model, scenarios) {
		/** @type {Object.<string, string>} */
		const labels = {};

		scenarios.forEach((d) => {
			d.pathways.forEach((e) => {
				labels[`${model}-${d.scenario}-${e}`] = scenarioLabelMap[`${model}-${d.scenario}`];
			});
		});

		return labels;
	}
</script>

<div class="container max-w-none lg:container md:grid grid-cols-2 px-0 md:px-16 lg:px-40">
	<div class="px-10 md:px-0">
		{#if selectedScenario}
			<ScenarioDescription model={selectedScenario.model} scenario={selectedScenario.scenario} />
		{/if}
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

		{#each $orderedModelScenarioPathways as { model, scenarios }}
			{@const names = getNames(model, scenarios)}
			{@const labels = getLabels(model, scenarios)}
			<section class="mb-12">
				<h6 class="font-space text-mid-grey pl-5 md:pl-0">{modelLabelMap[model]}</h6>
				{#if isEmissionsView}
					<div class="grid grid-cols-2 gap-3">
						<MiniCharts
							isButton={true}
							selected={selectedScenarioPathwayId}
							seriesNames={names}
							seriesLabels={labels}
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
							on:scenario-click={handleScenarioSelect}
						/>
						<MiniCharts
							isButton={true}
							selected={selectedScenarioPathwayId}
							seriesNames={names}
							seriesLabels={labels}
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
							on:scenario-click={handleScenarioSelect}
						/>
					</div>
				{:else}
					<MiniCharts
						isButton={true}
						selected={selectedScenarioPathwayId}
						seriesNames={names}
						seriesLabels={labels}
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
						on:scenario-click={handleScenarioSelect}
					/>
				{/if}
			</section>
		{/each}
	</section>
</div>
