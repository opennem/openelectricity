<script>
	import { getStratifyContext } from '../_state/context.js';
	import { builtInExamples, CHART_TYPE_GUIDANCE } from '$lib/stratify/example-catalogue.js';

	const project = getStratifyContext();
</script>

<div class="h-full overflow-y-auto p-6 md:p-10">
	<div class="mx-auto max-w-5xl">
		<div class="mb-8 max-w-2xl">
			<p class="mb-2 font-space text-xs font-medium uppercase tracking-wider text-red">
				Start here
			</p>
			<h2 class="mb-3 font-sans text-2xl leading-2xl font-semibold">
				Paste your data or begin with an example
			</h2>
			<p class="text-sm leading-relaxed text-mid-grey">
				Use the Data step for your own CSV, or load a complete example and replace its values later.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
			{#each builtInExamples as example (example.slug)}
				<button
					type="button"
					onclick={() => project.loadExample(example)}
					class="rounded-lg border border-warm-grey bg-white p-5 text-left transition hover:border-mid-grey hover:shadow-sm"
				>
					<span
						class="mb-2 block font-space text-xxs font-medium uppercase tracking-wider text-red"
					>
						{CHART_TYPE_GUIDANCE[example.chartType]?.label ?? example.chartType}
					</span>
					<strong class="mb-2 block font-sans text-sm font-semibold text-dark-grey"
						>{example.name}</strong
					>
					<span class="block text-xs leading-relaxed text-mid-grey">{example.summary}</span>
				</button>
			{/each}
		</div>
	</div>
</div>
