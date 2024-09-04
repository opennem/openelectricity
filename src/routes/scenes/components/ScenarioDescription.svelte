<script>
	import { getContext } from 'svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';
	import {
		scenarioLabels,
		scenarioSummary,
		scenarioKeyPoints,
		scenarioParagraphs
	} from '../page-data-options/descriptions';
	const { singleSelectionModel, singleSelectionScenario } = getContext('scenario-filters');

	let readMore = false;
</script>

<div class="relative h-auto px-10 pb-10 border-b border-warm-grey md:border-0 mb-10 md:mb-0">
	<div class="sticky top-0 md:pr-48">
		<!-- <h2 class="font-space uppercase text-sm text-mid-grey mb-12">Learn more about each scenario</h2> -->

		{#if $singleSelectionScenario}
			<h3 class="mb-12">{scenarioLabels[$singleSelectionModel][$singleSelectionScenario]}</h3>
			<p>{scenarioSummary[$singleSelectionModel][$singleSelectionScenario]}</p>

			<ul class="list-disc list-outside pl-12 my-12">
				{#each scenarioKeyPoints[$singleSelectionModel][$singleSelectionScenario] as key}
					<li class="font-bold">{key}</li>
				{/each}
			</ul>

			{#if !readMore}
				<Button class="w-full md:hidden" on:click={() => (readMore = true)}>Read more</Button>
			{/if}

			<div class="hidden md:block" class:!block={readMore}>
				{#each scenarioParagraphs[$singleSelectionModel][$singleSelectionScenario] as paragraph, i}
					<p class="my-12">
						{#if scenarioParagraphs[$singleSelectionModel][$singleSelectionScenario].length - 1 === i}
							<strong>Net zero summary: </strong>
						{/if}
						{paragraph}
					</p>
				{/each}
			</div>
		{/if}
	</div>
</div>
