<script>
	import Switch from '$lib/components/Switch.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import IconPlus from '$lib/icons/Plus.svelte';
	import IconMinus from '$lib/icons/Minus.svelte';

	import { dataTypeOptions } from '../page-data-options/data-types';
	import { regionOptions } from '../page-data-options/regions';
	import { scenarioLabels } from '../page-data-options/descriptions';
	import ScenarioSelection from './ScenarioSelection.svelte';

	const displayViewOptions = [
		{
			value: 'technology',
			label: 'By Technology'
		},
		{
			value: 'scenario',
			label: 'By Scenario'
		},
		{
			value: 'region',
			label: 'By Region'
		}
	];

	let selectedDisplayView = 'scenario';
	let selectedDataType = 'energy';
	let selectedRegion = '_all';
	let selectedModel = 'aemo2024';
	let selectedScenario = 'step_change';
	let showScenarioOptions = false;

	$: isTechnologyDisplay = selectedDisplayView === 'technology';
	$: isScenarioDisplay = selectedDisplayView === 'scenario';

	function handleDisplayViewChange(prevView, view) {
		console.log('prevView', prevView, 'view', view);
		selectedDisplayView = view;
	}
</script>

<div class="max-w-none flex gap-16 justify-between px-6 py-6">
	<a id="filters" class="hidden">Filters</a>
	<div class="flex gap-16 divide-x divide-warm-grey">
		<Switch
			buttons={displayViewOptions}
			selected={selectedDisplayView}
			on:change={(evt) => handleDisplayViewChange(selectedDisplayView, evt.detail.value)}
			class="justify-center my-4"
		/>

		<div class="py-2 flex items-center gap-6 pl-10 relative z-40">
			<FormSelect
				options={dataTypeOptions}
				selected={selectedDataType}
				on:change={(evt) => (selectedDataType = evt.detail.value)}
			/>

			{#if isTechnologyDisplay || isScenarioDisplay}
				<FormSelect
					options={regionOptions}
					selected={selectedRegion}
					on:change={(evt) => (selectedRegion = evt.detail.value)}
				/>
			{/if}

			{#if selectedModel && selectedScenario}
				<button
					class="text-sm flex items-center gap-3 justify-center px-8 py-4 border rounded-xl whitespace-nowrap bg-white text-dark-grey"
					class:border-dark-grey={showScenarioOptions}
					class:border-mid-warm-grey={!showScenarioOptions}
					on:click={() => (showScenarioOptions = !showScenarioOptions)}
				>
					{#if isScenarioDisplay}
						Update Scenarios
					{:else}
						{scenarioLabels[selectedModel] ? scenarioLabels[selectedModel][selectedScenario] : ''}
					{/if}

					{#if showScenarioOptions}
						<IconMinus />
					{:else}
						<IconPlus />
					{/if}
				</button>
			{/if}
		</div>
	</div>
</div>

<ScenarioSelection />
