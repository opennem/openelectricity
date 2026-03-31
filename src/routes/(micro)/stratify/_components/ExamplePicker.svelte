<script>
	import { getStratifyContext } from '../_state/context.js';
	import { examples } from '../_utils/examples.js';

	const project = getStratifyContext();
</script>

<div class="flex h-full flex-col items-center justify-center gap-6 text-mid-grey">
	<p class="text-sm">Paste CSV or tab-separated data to get started</p>
	<div class="text-center">
		<p class="mb-3 text-xs uppercase tracking-wider">or try an example</p>
		<div class="flex flex-wrap justify-center gap-2">
			{#each examples as example (example.name)}
				<button
					type="button"
					onclick={() => project.loadExample(example)}
					class="rounded-lg border border-mid-warm-grey px-3 py-1.5 text-xs text-dark-grey hover:border-dark-grey hover:bg-light-warm-grey"
				>
					{example.name}
				</button>
			{/each}
		</div>
	</div>
</div>
