<script>
	import { getContext } from 'svelte';

	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import { modelOptions } from '../../../../../routes/(main)/scenarios/page-data-options/models.js';
	import { homepageDataTechnologyGroupOptions } from '../helpers';

	let {
		isFetching = false,
		selectedGroup = 'homepage_preview',
		ongroupchange
	} = $props();

	const { selectedModel, scenarioOptions, selectedScenario } = getContext('scenario-filters');

	// Map modelOptions to FormSelect format
	const modelSelectOptions = modelOptions.map((m) => ({
		value: m.value,
		label: m.label
	}));

	$selectedModel = modelSelectOptions[0].value;

	let scenarios = $derived($scenarioOptions || []);
</script>

<div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
	<div class="flex items-center gap-2">
		<span class="text-mid-grey whitespace-nowrap">Plan</span>
		<FormSelect
			options={modelSelectOptions}
			selected={$selectedModel}
			onchange={(option) => ($selectedModel = option.value)}
		/>
	</div>

	<div class="flex items-center gap-2">
		<span class="text-mid-grey whitespace-nowrap">Scenario</span>
		<FormSelect
			options={scenarios}
			selected={$selectedScenario}
			onchange={(option) => ($selectedScenario = option.value)}
		/>
	</div>

	<div class="flex items-center gap-2">
		<span class="text-mid-grey whitespace-nowrap">View</span>
		<FormSelect
			options={homepageDataTechnologyGroupOptions}
			selected={selectedGroup}
			onchange={(option) => ongroupchange?.(/** @type {string} */ (option.value))}
		/>
	</div>

	{#if isFetching}
		<svg class="animate-spin h-4 w-4 text-mid-grey shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
		</svg>
	{/if}
</div>
