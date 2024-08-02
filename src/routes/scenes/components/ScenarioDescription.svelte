<script>
	import { getContext } from 'svelte';
	import {
		scenarioLabels,
		scenarioSummary,
		scenarioKeyPoints,
		scenarioParagraphs
	} from '../page-data-options/descriptions';
	const { singleSelectionModel, singleSelectionScenario } = getContext('scenario-filters');
</script>

<div class="relative h-auto">
	<div class="sticky top-0 pr-48">
		<h2 class="font-space uppercase text-sm text-mid-grey mb-12">Learn more about each scenario</h2>

		{#if $singleSelectionScenario}
			<h3 class="mb-12">{scenarioLabels[$singleSelectionModel][$singleSelectionScenario]}</h3>
			<p>{scenarioSummary[$singleSelectionModel][$singleSelectionScenario]}</p>

			<ul class="list-disc list-outside pl-12 my-12">
				{#each scenarioKeyPoints[$singleSelectionModel][$singleSelectionScenario] as key}
					<li class="font-bold">{key}</li>
				{/each}
			</ul>

			{#each scenarioParagraphs[$singleSelectionModel][$singleSelectionScenario] as paragraph, i}
				<p class="my-12">
					{#if scenarioParagraphs[$singleSelectionModel][$singleSelectionScenario].length - 1 === i}
						<strong>Net zero summary: </strong>
					{/if}
					{paragraph}
				</p>
			{/each}
		{/if}
	</div>
</div>
