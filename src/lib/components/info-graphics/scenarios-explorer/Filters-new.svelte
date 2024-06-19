<script>
	import { getContext } from 'svelte';

	import Switch from '$lib/components/Switch.svelte';

	import {
		modelOptions,
		regionOptions,
		dataViewOptions,
		displayViewOptions,
		chartTypeOptions
	} from './options';

	import { dataTechnologyGroupOptions, dataRegionCompareOptions } from './helpers';

	import Selection from './Selection.svelte';

	const {
		selectedModel,
		selectedRegion,
		selectedDataView,
		selectedDisplayView,
		selectedChartType,
		selectedScenario,
		selectedPathway,
		selectedCompareGroup,

		scenarioOptions,
		pathwayOptions
	} = getContext('scenario-filters');

	const { selectedGroup } = getContext('scenario-data');

	$selectedGroup = dataTechnologyGroupOptions[0].value;
	$selectedCompareGroup = dataRegionCompareOptions[0].value;

	$: isRegionDisplay = $selectedDisplayView === 'region';
	$: isScenarioDisplay = $selectedDisplayView === 'scenario';
	$: isTechnologyDisplay = $selectedDisplayView === 'technology';
	$: if (isTechnologyDisplay) {
		$selectedGroup = dataTechnologyGroupOptions[0].value;
	} else {
		$selectedGroup = dataRegionCompareOptions[0].value;
	}
</script>

<div class="border-b border-warm-grey">
	<div class="container">
		<div class="grid grid-cols-3 w-full md:w-2/3 gap-3 my-3">
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
		</div>
	</div>
</div>

<div class="container flex gap-16 divide-x divide-warm-grey">
	<Switch
		buttons={displayViewOptions}
		selected={$selectedDisplayView}
		on:change={(evt) => ($selectedDisplayView = evt.detail.value)}
		class="justify-center my-4"
	/>
	<div class="py-2 flex items-center gap-2 pl-10">
		<div>
			<Selection
				selectLabel="Projection:"
				widthClass="w-[200px]"
				options={dataViewOptions}
				selected={$selectedDataView}
				on:change={(evt) => ($selectedDataView = evt.detail.value)}
			/>
		</div>

		{#if isTechnologyDisplay}
			<div>
				<Selection
					selectLabel="Region:"
					widthClass="w-[230px]"
					options={regionOptions}
					selected={$selectedRegion}
					on:change={(evt) => ($selectedRegion = evt.detail.value)}
				/>
			</div>
		{/if}

		{#if isTechnologyDisplay}
			<div>
				<Selection
					selectLabel="Technology Group:"
					widthClass="w-[270px]"
					options={dataTechnologyGroupOptions}
					selected={$selectedGroup}
					on:change={(evt) => ($selectedGroup = evt.detail.value)}
				/>
			</div>
		{/if}

		{#if isRegionDisplay || isScenarioDisplay}
			<div>
				<Selection
					selectLabel="Technology:"
					widthClass="w-[270px]"
					options={dataRegionCompareOptions}
					selected={$selectedGroup}
					on:change={(evt) => ($selectedGroup = evt.detail.value)}
				/>
			</div>
		{/if}
	</div>
</div>

<!-- <div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="By:"
		widthClass="w-[150px]"
		options={displayViewOptions}
		selected={$selectedDisplayView}
		on:change={(evt) => ($selectedDisplayView = evt.detail.value)}
	/>
</div> -->

<!-- <div class="bg-light-warm-grey py-2 px-4 rounded">
	<Selection
		selectLabel="Chart:"
		widthClass="w-[270px]"
		options={chartTypeOptions}
		selected={$selectedChartType}
		on:change={(evt) => ($selectedChartType = evt.detail.value)}
	/>
</div> -->

<!-- {#if !isRegionDisplay}
	<div class="bg-light-warm-grey py-2 px-4 rounded">
		<Selection
			selectLabel="Grouping:"
			widthClass="w-[270px]"
			options={dataTechnologyGroupOptions}
			selected={$selectedGroup}
			on:change={(evt) => ($selectedGroup = evt.detail.value)}
		/>
	</div>
{/if}

{#if isRegionDisplay}
	<div class="bg-light-warm-grey py-2 px-4 rounded">
		<Selection
			selectLabel="Compare:"
			widthClass="w-[270px]"
			options={dataRegionCompareOptions}
			selected={$selectedGroup}
			on:change={(evt) => ($selectedGroup = evt.detail.value)}
		/>
	</div>
{/if} -->
