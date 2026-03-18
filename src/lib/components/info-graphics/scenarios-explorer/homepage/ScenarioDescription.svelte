<script>
	import { getContext } from 'svelte';
	import { scenarioLabels, scenarioDescriptions } from '../descriptions';

	const { selectedModel, selectedScenario } = getContext('scenario-filters');

	let label = $derived(scenarioLabels[$selectedModel]?.[$selectedScenario] || '');
	let description = $derived(
		/** @type {any} */ (scenarioDescriptions)[$selectedModel]?.[$selectedScenario] || ''
	);
</script>

{#if label || description}
	<div class="mt-12 pointer-events-none">
		{#if label}
			<h6 class="subhead-secondary mb-6 md:block hidden">
				{label}
			</h6>
		{/if}
		{#if description}
			<p class="text-dark-grey text-base leading-base font-semibold md:text-xl md:leading-xl">
				{description}
			</p>
		{/if}
	</div>
{/if}
