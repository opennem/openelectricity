<script>
	import { getStratifyContext } from '../_state/context.js';
	import { CHART_STYLE_PRESETS } from '$lib/stratify/chart-styles.js';

	const project = getStratifyContext();
</script>

<div class="flex flex-col gap-1.5">
	{#each CHART_STYLE_PRESETS as preset (preset.id)}
		<button
			type="button"
			onclick={() => {
				project.stylePreset = preset.id;
				project.userSeriesColours = {};
			}}
			class="flex items-center gap-2.5 px-2.5 py-2 rounded border text-left transition-colors {project.stylePreset ===
			preset.id
				? 'border-dark-grey bg-white'
				: 'border-warm-grey hover:border-mid-warm-grey'}"
		>
			<div class="flex gap-0.5 flex-shrink-0">
				{#each preset.colours.slice(0, 6) as colour, i (colour + i)}
					<span class="block w-3 h-3 rounded-sm" style="background: {colour};"></span>
				{/each}
			</div>
			<div class="min-w-0">
				<span class="text-[11px] text-dark-grey block leading-tight">{preset.name}</span>
				<span class="text-[9px] text-mid-grey block leading-tight truncate"
					>{preset.description}</span
				>
			</div>
		</button>
	{/each}
</div>
