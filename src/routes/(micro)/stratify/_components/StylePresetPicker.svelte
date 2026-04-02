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
			class="flex-1 px-2.5 py-2 rounded border text-left transition-colors {project.stylePreset === theme.id
				? 'border-dark-grey bg-white'
				: 'border-warm-grey hover:border-mid-warm-grey'}"
		>
			<span class="text-[11px] text-dark-grey block leading-tight">{theme.name}</span>
		</button>
	{/each}
</div>
