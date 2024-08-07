<script>
	import { getContext } from 'svelte';
	import Switch from '$lib/components/Switch.svelte';

	import ScenarioDescription from './ScenarioDescription.svelte';
	import MiniCharts from './MiniCharts.svelte';

	/** @type {Object.<string, *>} */
	const dataVizStores = {
		energyDataVizStore: getContext('energy-data-viz'),
		emissionsDataVizStore: getContext('emissions-data-viz'),
		capacityDataVizStore: getContext('capacity-data-viz'),
		intensityDataVizStore: getContext('intensity-data-viz')
	};

	let selectedStoreName = 'energyDataVizStore';

	const stores = [
		{ value: 'energyDataVizStore', label: 'Generation' },
		{ value: 'emissionsDataVizStore', label: 'Emissions' },
		{ value: 'capacityDataVizStore', label: 'Capacity' }
	];

	$: selectedStore = dataVizStores[selectedStoreName];
	$: seriesNames = selectedStore.seriesNames;
	$: seriesLabels = selectedStore.seriesLabels;
	$: seriesColours = selectedStore.seriesColours;
	$: xTicks = selectedStore.xTicks;
	$: formatTickX = selectedStore.formatTickX;
	$: formatTickY = selectedStore.formatTickY;
	$: chartOverlay = selectedStore.chartOverlay;
	$: chartOverlayLine = selectedStore.chartOverlayLine;
	$: chartOverlayHatchStroke = selectedStore.chartOverlayHatchStroke;
	$: hoverData = selectedStore.hoverData;
	$: seriesData = selectedStore.seriesData;
</script>

<ScenarioDescription />

<section>
	<Switch
		buttons={stores}
		selected={selectedStoreName}
		on:change={(evt) => (selectedStoreName = evt.detail.value)}
		class="justify-center my-4"
	/>
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
		seriesData={$seriesData}
		on:mousemove
		on:mouseout
	/>
</section>
