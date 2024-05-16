<script>
	import { getContext } from 'svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	const {
		// selectedModel,
		selectedScenario,
		selectedPathway,
		// modelOptions,
		scenarioOptions,
		pathwayOptions
	} = getContext('projection-explorer');

	const { selectedModel, modelOptions } = getContext('model');
</script>

<div>
	<p class="mb-0">Model:</p>

	<div class="w-[240px]">
		<FormSelect
			options={modelOptions}
			selected={$selectedModel}
			on:change={(evt) => ($selectedModel = evt.detail.value)}
		/>
	</div>
</div>

<div class="px-6">
	<p class="mb-0">Scenario:</p>

	<div class="w-[240px]">
		<FormSelect
			options={$scenarioOptions}
			selected={$selectedScenario}
			on:change={(evt) => ($selectedScenario = evt.detail.value)}
		/>
	</div>
</div>

<div class="px-6">
	<p class="mb-0">Pathway:</p>

	<div class="w-[200px]">
		<FormSelect
			options={$pathwayOptions}
			selected={$selectedPathway}
			on:change={(evt) => ($selectedPathway = evt.detail.value)}
		/>
	</div>
</div>
