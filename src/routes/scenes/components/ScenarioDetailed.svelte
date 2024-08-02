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

	let selectedStoreName = 'capacityDataVizStore';

	const stores = [
		{ value: 'energyDataVizStore', label: 'Generation' },
		{ value: 'emissionsDataVizStore', label: 'Emissions' },
		{ value: 'capacityDataVizStore', label: 'Capacity' }
	];

	$: selectedStore = dataVizStores[selectedStoreName];
	$: console.log('selectedStoreName', selectedStoreName, selectedStore);
</script>

<ScenarioDescription />

<div>
	<Switch
		buttons={stores}
		selected={selectedStoreName}
		on:change={(evt) => (selectedStoreName = evt.detail.value)}
		class="justify-center my-4"
	/>
	<MiniCharts store={selectedStore} />
</div>
