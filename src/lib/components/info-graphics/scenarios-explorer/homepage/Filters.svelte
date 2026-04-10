<script>
	import { getContext } from 'svelte';

	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import { modelOptions } from '../../../../../routes/(main)/scenarios/page-data-options/models.js';
	import { homepageDataTechnologyGroupOptions } from '../helpers';

	let { isFetching = false, selectedGroup = 'homepage_preview', ongroupchange } = $props();

	const { selectedModel, scenarioOptions, selectedScenario } = getContext('scenario-filters');

	const latestModel = modelOptions[0];
	$selectedModel = latestModel.value;

	let scenarios = $derived($scenarioOptions || []);
</script>

<div class="text-sm border-b border-warm-grey pb-4 mb-2 sm:flex gap-8">
	<div class="flex items-center gap-2">
		<span class="text-mid-grey whitespace-nowrap w-[35%] sm:w-auto">Model</span>
		<span class="whitespace-nowrap font-semibold">{latestModel.label}</span>
	</div>

	<div class="flex items-center justify-between gap-2 sm:justify-start">
		<span class="text-mid-grey whitespace-nowrap w-[35%] sm:w-auto">Scenario</span>
		<FormSelect
			options={scenarios}
			selected={$selectedScenario}
			onchange={(option) => ($selectedScenario = option.value)}
		/>
	</div>

	<div class="flex items-center justify-between gap-2 sm:justify-start">
		<span class="text-mid-grey whitespace-nowrap w-[35%] sm:w-auto">View</span>
		<FormSelect
			options={homepageDataTechnologyGroupOptions}
			selected={selectedGroup}
			onchange={(option) => ongroupchange?.(/** @type {string} */ (option.value))}
		/>
	</div>

	{#if isFetching}
		<svg
			class="animate-spin h-4 w-4 text-mid-grey shrink-0"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
			></path>
		</svg>
	{/if}
</div>
