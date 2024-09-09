<script>
	import { createEventDispatcher } from 'svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	import { scenarioLabels, scenarioDescriptions } from '../page-data-options/descriptions';

	const dispatch = createEventDispatcher();

	/** @type {*} */
	export let selectedScenario = null;
	/** @type {string} */
	export let selectedPathway = '';
	/** @type {string[]}*/
	export let pathways = [];

	export let showTitle = true;
	export let showDescription = true;
	export let position = 'bottom';
	export let align = 'left';

	/** @param {*} event */
	function handlePathwayChange(event) {
		dispatch('change', { value: event.detail.value });
	}
</script>

{#if showTitle}
	<h6 class="text-mid-grey">
		{scenarioLabels[selectedScenario.model][selectedScenario.value]}
	</h6>
{/if}
{#if showDescription}
	<p class="text-sm md:my-6">
		{scenarioDescriptions[selectedScenario.model][selectedScenario.value]}
	</p>
{/if}

<div class="flex" class:justify-end={align === 'right'}>
	<div class="border border-mid-grey text-sm inline-block rounded-md">
		<FormSelect
			paddingY="py-3"
			paddingX="px-4"
			{position}
			{align}
			options={pathways.map((pathway) => ({ value: pathway, label: pathway }))}
			selected={selectedPathway}
			on:change={handlePathwayChange}
		/>
	</div>
</div>
