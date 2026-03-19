<script>
	import { getContext } from 'svelte';

	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import { modelOptions } from '../../../../../routes/(main)/scenarios/page-data-options/models.js';

	let { isFetching = false } = $props();

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

		<div class="flex items-center gap-2">
			<div class="grow">
				<FormSelect
					paddingY="py-3"
					paddingX="px-4"
					options={modelSelectOptions}
					selected={$selectedModel}
					onchange={(option) => ($selectedModel = option.value)}
				/>
			</div>
			{#if isFetching}
				<svg class="animate-spin h-4 w-4 text-mid-grey shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
			{/if}
		</div>
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
