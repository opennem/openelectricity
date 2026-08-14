<script>
	import { getStratifyContext } from '../_state/context.js';
	import { CHART_THEMES } from '$lib/stratify/chart-styles.js';

	const project = getStratifyContext();
</script>

<div class="flex gap-1.5">
	{#each CHART_THEMES as theme (theme.id)}
		<button
			type="button"
			onclick={() => {
				project.stylePreset = theme.id;
			}}
			class="flex-1 rounded-lg border px-3 py-3 text-left transition-colors {project.stylePreset ===
			theme.id
				? 'border-dark-grey bg-light-warm-grey'
				: 'border-warm-grey hover:border-mid-warm-grey'}"
		>
			<span class="block font-sans text-xs font-medium leading-tight text-dark-grey"
				>{theme.name}</span
			>
		</button>
	{/each}
</div>
