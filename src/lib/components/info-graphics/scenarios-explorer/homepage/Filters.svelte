<script>
	import { getContext } from 'svelte';

	import Switch from '$lib/components/Switch.svelte';
	import IconPlus from '$lib/icons/Plus.svelte';
	import IconMinus from '$lib/icons/Minus.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import Selection from '../Selection.svelte';

	import { modelOptions, dataViewOptions, displayViewOptions } from '../options';
	import { scenarioLabels } from '../descriptions';
	import { dataTechnologyGroupOptions, dataRegionCompareOptions } from '../helpers';

	const {
		selectedModel,

		scenarioOptions,
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

	$selectedModel = modelOptions[0].value;
	$selectedGroup = dataTechnologyGroupOptions[0].value;
	$selectedCompareGroup = dataRegionCompareOptions[0].value;

	$: if ($isTechnologyDisplay) {
		$selectedGroup = dataTechnologyGroupOptions[0].value;
	} else {
		$selectedGroup = dataRegionCompareOptions[0].value;
	}
</script>

<div class="relative md:absolute mt-10 z-50 md:w-[380px] text-sm">
	<div class="">
		<p>
			A range of modelled scenarios exist which envision the evolution of Australia's National
			Electricity Market (NEM) over the coming decades.
		</p>
		<p>
			These scenarios aim to steer Australia towards a cost-effective, reliable and safe energy
			system en route to a zero-emissions electricity network.
		</p>

		<p class="mb-0">Explore the scenarios:</p>

		<FormSelect
			paddingY="py-3"
			paddingX="px-4"
			options={modelOptions}
			selected={$selectedModel}
			on:change={(evt) => ($selectedModel = evt.detail.value)}
		/>
	</div>

	<div
		class="grid gap-3 mt-6"
		class:grid-cols-3={$scenarioOptions.length === 3}
		class:grid-cols-2={$scenarioOptions.length !== 3}
	>
		{#each $scenarioOptions as { label, value }}
			<button
				class="w-full rounded-lg border hover:bg-light-warm-grey px-6 py-4 capitalize text-left leading-sm"
				class:border-mid-warm-grey={$selectedScenario !== value}
				class:text-mid-grey={$selectedScenario !== value}
				class:border-dark-grey={$selectedScenario === value}
				class:bg-white={$selectedScenario !== value}
				class:bg-light-warm-grey={$selectedScenario === value}
				{value}
				on:click={() => ($selectedScenario = value)}
			>
				{label}
			</button>
		{/each}
	</div>
</div>
