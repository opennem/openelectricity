<script>
	import { getContext } from 'svelte';

	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import { modelOptions } from '../../../../../routes/(main)/scenarios/page-data-options/models.js';

	const { selectedModel, scenarioOptions, selectedScenario } = getContext('scenario-filters');

	// Map modelOptions to FormSelect format
	const modelSelectOptions = modelOptions.map((m) => ({
		value: m.value,
		label: m.label
	}));

	$selectedModel = modelSelectOptions[0].value;

	let scenarios = $derived($scenarioOptions || []);
</script>

<div class="text-sm">
	<div class="pl-0 pt-0 md:pl-4 md:pt-4 mt-8">
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
			options={modelSelectOptions}
			selected={$selectedModel}
			onchange={(option) => ($selectedModel = option.value)}
		/>
	</div>

	<div
		class="grid gap-3 mt-6 ml-4"
		class:grid-cols-3={scenarios.length === 3}
		class:grid-cols-2={scenarios.length !== 3}
	>
		{#each scenarios as { label, value } (value)}
			<button
				class="w-full rounded-lg border hover:bg-light-warm-grey px-6 py-4 capitalize text-left leading-sm"
				class:border-mid-warm-grey={$selectedScenario !== value}
				class:text-mid-grey={$selectedScenario !== value}
				class:border-dark-grey={$selectedScenario === value}
				class:bg-white={$selectedScenario !== value}
				class:bg-light-warm-grey={$selectedScenario === value}
				{value}
				onclick={() => ($selectedScenario = value)}
			>
				{label}
			</button>
		{/each}
	</div>
</div>
