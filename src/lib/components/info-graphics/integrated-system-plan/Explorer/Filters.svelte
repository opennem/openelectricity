<script>
	import { getContext } from 'svelte';
	import Selection from './Selection.svelte';

	const {
		selectedModel,
		modelOptions,
		selectedRegion,
		regionOptions,
		selectedDataView,
		dataViewOptions,
		selectedDisplayView,
		displayViewOptions,
		selectedChartType,
		chartTypeOptions
	} = getContext('model');

	const {
		selectedScenario,
		selectedPathway,
		scenarioOptions,
		pathwayOptions,
		selectedFuelTechGrouping,
		fuelTechGroupingOptions
	} = getContext('projection-explorer');
</script>

<div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="By:"
		widthClass="w-[150px]"
		options={displayViewOptions}
		selected={$selectedDisplayView}
		on:change={(evt) => ($selectedDisplayView = evt.detail.value)}
	/>
</div>

<div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="Region:"
		widthClass="w-[270px]"
		options={regionOptions}
		selected={$selectedRegion}
		on:change={(evt) => ($selectedRegion = evt.detail.value)}
	/>
</div>

<div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="Data:"
		widthClass="w-[170px]"
		options={dataViewOptions}
		selected={$selectedDataView}
		on:change={(evt) => ($selectedDataView = evt.detail.value)}
	/>
</div>

<div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="Model:"
		widthClass="w-[240px]"
		options={modelOptions}
		selected={$selectedModel}
		on:change={(evt) => ($selectedModel = evt.detail.value)}
	/>
</div>

<div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="Scenario:"
		widthClass="w-[240px]"
		options={$scenarioOptions}
		selected={$selectedScenario}
		on:change={(evt) => ($selectedScenario = evt.detail.value)}
	/>
</div>

<div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="Pathway:"
		widthClass="w-[200px]"
		options={$pathwayOptions}
		selected={$selectedPathway}
		on:change={(evt) => ($selectedPathway = evt.detail.value)}
	/>
</div>

<div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="Chart:"
		widthClass="w-[270px]"
		options={chartTypeOptions}
		selected={$selectedChartType}
		on:change={(evt) => ($selectedChartType = evt.detail.value)}
	/>
</div>

<div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="Grouping:"
		widthClass="w-[270px]"
		options={fuelTechGroupingOptions}
		selected={$selectedFuelTechGrouping}
		on:change={(evt) => ($selectedFuelTechGrouping = evt.detail.value)}
	/>
</div>
