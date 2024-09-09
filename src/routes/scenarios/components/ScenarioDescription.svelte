<script>
	import { getContext } from 'svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';
	import {
		scenarioLabels,
		scenarioSummary,
		scenarioKeyPoints,
		scenarioParagraphs
	} from '../page-data-options/descriptions';

	export let model = null;
	export let scenario = null;

	const { singleSelectionModel, singleSelectionScenario } = getContext('scenario-filters');

	let readMore = false;

	$: selectedModel = model || $singleSelectionModel;
	$: selectedScenario = scenario || $singleSelectionScenario;
</script>

<div class="relative h-auto pb-10 border-b border-warm-grey md:border-0 mb-10 md:mb-0">
	<div class="sticky top-0 md:pr-48">
		<!-- <h2 class="font-space uppercase text-sm text-mid-grey mb-12">Learn more about each scenario</h2> -->

		{#if selectedModel}
			<h3 class="mb-12">{scenarioLabels[selectedModel][selectedScenario]}</h3>
			<p>{scenarioSummary[selectedModel][selectedScenario]}</p>

			<ul class="list-disc list-outside pl-12 my-12">
				{#each scenarioKeyPoints[selectedModel][selectedScenario] as key}
					<li class="font-bold">{key}</li>
				{/each}
			</ul>

			{#if !readMore}
				<Button class="w-full md:hidden" on:click={() => (readMore = true)}>Read more</Button>
			{/if}

			<div class="hidden md:block" class:!block={readMore}>
				{#each scenarioParagraphs[selectedModel][selectedScenario] as paragraph, i}
					<p class="my-12">
						{#if scenarioParagraphs[selectedModel][selectedScenario].length - 1 === i}
							<strong>Net zero summary: </strong>
						{/if}
						{paragraph}
					</p>
				{/each}
			</div>
		{/if}
	</div>
</div>
