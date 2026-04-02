<script>
	import { CHART_TYPES } from '$lib/stratify/chart-types.js';
	import { getStratifyContext } from '../_state/context.js';

	const project = getStratifyContext();
</script>

<div>
	<select
		value={project.chartType}
		onchange={(e) => {
			project.chartType = /** @type {import('$lib/stratify/chart-types.js').ChartType} */ (
				e.currentTarget.value
			);
		}}
		class="w-full bg-light-warm-grey/50 border border-warm-grey rounded px-2 py-1.5 text-[11px] text-dark-grey focus:outline-none focus:border-dark-grey"
	>
		{#each CHART_TYPES as type (type.value)}
			<option value={type.value}>{type.label}</option>
		{/each}
	</select>
</div>
