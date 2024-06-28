<script>
	import { getContext } from 'svelte';

	import Switch from '$lib/components/Switch.svelte';
	import IconPlus from '$lib/icons/Plus.svelte';
	import IconMinus from '$lib/icons/Minus.svelte';

	import Selection from './Selection.svelte';

	import { regionOptions, dataViewOptions, displayViewOptions } from './options';
	import { scenarioLabels } from './descriptions';
	import { dataTechnologyGroupOptions, dataRegionCompareOptions } from './helpers';

	const {
		selectedModel,
		selectedRegion,
		selectedDataView,
		selectedDisplayView,
		selectedScenario,
		selectedCompareGroup,

		showScenarioOptions,

		isTechnologyDisplay,
		isScenarioDisplay,
		isRegionDisplay
	} = getContext('scenario-filters');

	const { selectedGroup } = getContext('scenario-data');

	$selectedGroup = dataTechnologyGroupOptions[0].value;
	$selectedCompareGroup = dataRegionCompareOptions[0].value;

	$: if ($isTechnologyDisplay) {
		$selectedGroup = dataTechnologyGroupOptions[0].value;
	} else {
		$selectedGroup = dataRegionCompareOptions[0].value;
	}
</script>

<div class="container max-w-none flex gap-16 divide-x divide-warm-grey">
	<Switch
		buttons={displayViewOptions}
		selected={$selectedDisplayView}
		on:change={(evt) => ($selectedDisplayView = evt.detail.value)}
		class="justify-center my-4"
	/>
	<div class="py-2 flex items-center gap-2 pl-10 relative z-40">
		<div>
			<Selection
				selectLabel="Projection:"
				widthClass="w-[160px]"
				options={dataViewOptions}
				selected={$selectedDataView}
				on:change={(evt) => ($selectedDataView = evt.detail.value)}
			/>
		</div>

		{#if $isTechnologyDisplay || $isScenarioDisplay}
			<div>
				<Selection
					selectLabel="Region:"
					widthClass="w-[220px]"
					options={regionOptions}
					selected={$selectedRegion}
					on:change={(evt) => ($selectedRegion = evt.detail.value)}
				/>
			</div>
		{/if}

		{#if $selectedModel && $selectedScenario}
			<button
				class="text-sm flex items-center gap-3 justify-center px-8 py-4 border rounded-xl whitespace-nowrap bg-white text-dark-grey"
				class:border-dark-grey={$showScenarioOptions}
				class:border-mid-warm-grey={!$showScenarioOptions}
				on:click={() => ($showScenarioOptions = !$showScenarioOptions)}
			>
				{#if $isScenarioDisplay}
					Update Scenarios
				{:else}
					{scenarioLabels[$selectedModel][$selectedScenario]}
				{/if}

				{#if $showScenarioOptions}
					<IconMinus />
				{:else}
					<IconPlus />
				{/if}
			</button>
		{/if}
	</div>
</div>
