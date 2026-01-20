<script>
	import { getContext } from 'svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';
	import {
		scenarioLabels,
		scenarioSummary,
		scenarioKeyPoints,
		scenarioParagraphs,
		scenarioDescriptions
	} from '../page-data-options/descriptions';

	/**
	 * @typedef {Object} Props
	 * @property {any} [model]
	 * @property {any} [scenario]
	 * @property {boolean} [showDescription]
	 */

	/** @type {Props} */
	let { model = null, scenario = null, showDescription = true } = $props();

	const { singleSelectionModel, singleSelectionScenario } = getContext('scenario-filters');

	let readMore = $state(false);

	let selectedModel = $derived(model || $singleSelectionModel);
	let selectedScenario = $derived(scenario || $singleSelectionScenario);

	let isAemo2024 = $derived(selectedModel === 'aemo2024');
</script>

{#if showDescription}
	<div class="relative h-auto pb-10 border-b border-warm-grey md:border-0 mb-10 md:mb-0">
		<div class="sticky top-0 md:pr-48">
			{#if selectedModel}
				<h3 class="mb-12">{scenarioLabels[selectedModel][selectedScenario]}</h3>

				{#if isAemo2024}
					<p>{scenarioSummary[selectedModel][selectedScenario]}</p>
					<ul class="list-disc list-outside pl-12 my-12">
						{#each scenarioKeyPoints[selectedModel][selectedScenario] as key (key)}
							<li class="font-bold">{key}</li>
						{/each}
					</ul>

					{#if !readMore}
						<Button class="w-full md:hidden" onclick={() => (readMore = true)}>Read more</Button>
					{/if}

					<div class="hidden md:block" class:!block={readMore}>
						{#each scenarioParagraphs[selectedModel][selectedScenario] as paragraph, i (i)}
							<p class="my-12">
								{#if scenarioParagraphs[selectedModel][selectedScenario].length - 1 === i}
									<strong>Net zero summary: </strong>
								{/if}
								{paragraph}
							</p>
						{/each}
					</div>
				{:else}
					<p>{scenarioDescriptions[selectedModel][selectedScenario]}</p>
				{/if}
			{/if}
		</div>
	</div>
{/if}
