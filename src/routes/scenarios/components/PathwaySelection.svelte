<script>
	import { createEventDispatcher } from 'svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';

	import { scenarioLabels, scenarioDescriptions } from '../page-data-options/descriptions';

	const dispatch = createEventDispatcher();

	export let isRadioMode = false;
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

	/** @type {*} */
	export let selectedPathways = [];

	/** @param {*} event */
	function handlePathwayChange(event) {
		dispatch('change', { value: event.detail.value });
	}

	/** @param {*} event */
	function handlePathwaysChange(event) {
		let updated = [];
		if (selectedPathways.includes(event.detail.value)) {
			updated = selectedPathways.filter((pathway) => pathway !== event.detail.value);
		} else {
			updated = [...selectedPathways, event.detail.value];
		}
		dispatch('change-multiple', { value: updated });
	}

	$: options = pathways.map((pathway) => ({ value: pathway, label: pathway }));
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
	{#if isRadioMode}
		<div class="border border-mid-grey text-sm inline-block rounded-md">
			<FormSelect
				paddingY="py-3"
				paddingX="px-4"
				{position}
				{align}
				{options}
				selected={selectedPathway}
				on:change={handlePathwayChange}
			/>
		</div>
	{:else}
		<div class="border border-mid-grey text-sm inline-block rounded-md">
			<FormMultiSelect
				{position}
				{align}
				{options}
				selected={selectedPathways}
				label="Pathways"
				paddingY="py-3"
				paddingX="px-4"
				on:change={handlePathwaysChange}
			/>
		</div>
	{/if}
</div>
