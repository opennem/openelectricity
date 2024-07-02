<script>
	import { getContext } from 'svelte';
	import { scenarioLabels, scenarioDescriptions } from '../descriptions';

	const { selectedModel, selectedScenario } = getContext('scenario-filters');
</script>

<div class="md:absolute z-50 mt-12 md:mt-32 md:w-[400px] left-[560px]">
	<h6 class="subhead-secondary mb-6 md:block hidden">
		{scenarioLabels[$selectedModel][$selectedScenario]}
	</h6>
	<p class="text-dark-grey text-base leading-base font-semibold md:text-xl md:leading-xl">
		{scenarioDescriptions[$selectedModel][$selectedScenario]}
	</p>
</div>
