<script>
	import { getContext } from 'svelte';
	import Switch from '$lib/components/Switch.svelte';

	import ScenarioDescription from './ScenarioDescription.svelte';
	import MiniCharts from './MiniCharts.svelte';

	
	/**
	 * @typedef {Object} Props
	 * @property {string[]} [seriesLoadsIds]
	 */

	/** @type {Props} */
	let { seriesLoadsIds = [] } = $props();

	/** @type {Object.<string, *>} */
	const dataVizStores = {
		energyDataVizStore: getContext('energy-data-viz'),
		emissionsDataVizStore: getContext('emissions-data-viz'),
		capacityDataVizStore: getContext('capacity-data-viz'),
		intensityDataVizStore: getContext('intensity-data-viz')
	};

	const { singleSelectionModel } = getContext('scenario-filters');

	let selectedStoreName = $state('energyDataVizStore');

	const stores = [
		{ value: 'energyDataVizStore', label: 'Generation' },
		{ value: 'emissionsDataVizStore', label: 'Emissions' },
		{ value: 'capacityDataVizStore', label: 'Capacity' }
	];

	let isEmissionsView = $derived(selectedStoreName === 'emissionsDataVizStore');

	let selectedStore = $derived(dataVizStores[selectedStoreName]);
	let seriesNames = $derived(selectedStore.seriesNames);
	let seriesLabels = $derived(selectedStore.seriesLabels);
	let seriesColours = $derived(selectedStore.seriesColours);
	let xTicks = $derived(selectedStore.miniXTicks);
	let formatTickX = $derived(selectedStore.formatTickX);
	let formatTickY = $derived(selectedStore.convertAndFormatValue);
	let chartOverlay = $derived(selectedStore.chartOverlay);
	let chartOverlayLine = $derived(selectedStore.chartOverlayLine);
	let chartOverlayHatchStroke = $derived(selectedStore.chartOverlayHatchStroke);
	let hoverData = $derived(selectedStore.hoverData);
	let focusData = $derived(selectedStore.focusData);
	let seriesData = $derived(selectedStore.seriesData);
	let displayUnit = $derived(selectedStore.displayUnit);

	let intensityStore = $derived(dataVizStores.intensityDataVizStore);
	let intensitySeriesNames = $derived(intensityStore.seriesNames);
	let intensityFormatTickY = $derived(intensityStore.convertAndFormatValue);
	let intensitySeriesLabels = $derived(intensityStore.seriesLabels);
	let intensitySeriesColours = $derived(intensityStore.seriesColours);
	let intensityHoverData = $derived(intensityStore.hoverData);
	let intensityFocusData = $derived(intensityStore.focusData);
	let intensitySeriesData = $derived(intensityStore.seriesData);
	let intensityDisplayUnit = $derived(intensityStore.displayUnit);

	let isAemo2024 = $derived($singleSelectionModel === 'aemo2024');
</script>

<div
	class="container max-w-none lg:container md:w-1/2 md:grid px-0 md:px-16 lg:px-40"
	class:grid-cols-2={isAemo2024}
	class:md:w-full={isAemo2024}
>
	<div class="px-10 md:px-0">
		<ScenarioDescription showDescription={isAemo2024} />
	</div>

	<section>
		<div class="flex justify-center mb-12">
			<Switch
				buttons={stores}
				selected={selectedStoreName}
				on:change={(evt) => (selectedStoreName = evt.detail.value)}
				class="justify-center"
			/>
		</div>

		{#if isEmissionsView}
			<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
				<MiniCharts
					seriesNames={$seriesNames}
					seriesLabels={$seriesLabels}
					seriesColours={$seriesColours}
					xTicks={$xTicks}
					formatTickX={$formatTickX}
					formatTickY={$formatTickY}
					chartOverlay={$chartOverlay}
					chartOverlayLine={$chartOverlayLine}
					chartOverlayHatchStroke={$chartOverlayHatchStroke}
					hoverData={$hoverData}
					focusData={$focusData}
					seriesData={$seriesData}
					displayUnit={$displayUnit}
					{seriesLoadsIds}
					gridColClass="grid-cols-1"
					on:mousemove
					on:mouseout
					on:pointerup
				/>
				<MiniCharts
					seriesNames={$intensitySeriesNames}
					seriesLabels={$intensitySeriesLabels}
					seriesColours={$intensitySeriesColours}
					xTicks={$xTicks}
					formatTickX={$formatTickX}
					formatTickY={$intensityFormatTickY}
					chartOverlay={$chartOverlay}
					chartOverlayLine={$chartOverlayLine}
					chartOverlayHatchStroke={$chartOverlayHatchStroke}
					hoverData={$intensityHoverData}
					focusData={$intensityFocusData}
					seriesData={$intensitySeriesData}
					displayUnit={$intensityDisplayUnit}
					showArea={false}
					{seriesLoadsIds}
					gridColClass="grid-cols-1"
					on:mousemove
					on:mouseout
					on:pointerup
				/>
			</div>
		{:else}
			<MiniCharts
				seriesNames={$seriesNames}
				seriesLabels={$seriesLabels}
				seriesColours={$seriesColours}
				xTicks={$xTicks}
				formatTickX={$formatTickX}
				formatTickY={$formatTickY}
				chartOverlay={$chartOverlay}
				chartOverlayLine={$chartOverlayLine}
				chartOverlayHatchStroke={$chartOverlayHatchStroke}
				hoverData={$hoverData}
				focusData={$focusData}
				seriesData={$seriesData}
				displayUnit={$displayUnit}
				{seriesLoadsIds}
				on:mousemove
				on:mouseout
				on:pointerup
			/>
		{/if}
	</section>
</div>
