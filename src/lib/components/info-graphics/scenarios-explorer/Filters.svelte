<script>
	import { getContext } from 'svelte';
	import {
		modelOptions,
		regionOptions,
		dataViewOptions,
		displayViewOptions,
		chartTypeOptions
	} from './options';
	import { groups } from './groups';
	import Selection from './Selection.svelte';

	const {
		selectedModel,
		selectedRegion,
		selectedDataView,
		selectedDisplayView,
		selectedChartType,
		selectedScenario,
		selectedPathway,

		scenarioOptions,
		pathwayOptions
	} = getContext('scenario-filters');

	const { selectedGroup } = getContext('scenario-data');

	$: isRegionDisplay = $selectedDisplayView === 'region';
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
		selectLabel="Model:"
		widthClass="w-[240px]"
		options={modelOptions}
		selected={$selectedModel}
		on:change={(evt) => ($selectedModel = evt.detail.value)}
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

{#if !isRegionDisplay}
	<div class="bg-light-warm-grey py-2 px-4 rounded">
		<Selection
			selectLabel="Region:"
			widthClass="w-[270px]"
			options={regionOptions}
			selected={$selectedRegion}
			on:change={(evt) => ($selectedRegion = evt.detail.value)}
		/>
	</div>
{/if}

<!-- <div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="Chart:"
		widthClass="w-[270px]"
		options={chartTypeOptions}
		selected={$selectedChartType}
		on:change={(evt) => ($selectedChartType = evt.detail.value)}
	/>
</div> -->

{#if !isRegionDisplay}
	<div class="bg-light-warm-grey py-2 px-4 rounded">
		<Selection
			selectLabel="Grouping:"
			widthClass="w-[270px]"
			options={groups}
			selected={$selectedGroup}
			on:change={(evt) => ($selectedGroup = evt.detail.value)}
		/>
	</div>
{/if}
