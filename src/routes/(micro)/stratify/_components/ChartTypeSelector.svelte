<script>
	import { CHART_TYPES } from '$lib/stratify/chart-types.js';
	import { CHART_TYPE_GUIDANCE } from '$lib/stratify/example-catalogue.js';
	import { getStratifyContext } from '../_state/context.js';
	import ChartTypeGraphic from './ChartTypeGraphic.svelte';

	const project = getStratifyContext();

	let expanded = $state(false);
	let selectedType = $derived(
		CHART_TYPES.find((type) => type.value === project.chartType) ?? CHART_TYPES[0]
	);
	let selectedGuidance = $derived(CHART_TYPE_GUIDANCE[selectedType.value]);

	/** @param {import('$lib/stratify/chart-types.js').ChartType} chartType */
	function selectChartType(chartType) {
		project.chartType = chartType;
		expanded = false;
	}
</script>

<button
	type="button"
	onclick={() => (expanded = !expanded)}
	aria-expanded={expanded}
	aria-controls="chart-type-options"
	class="flex w-full items-center gap-4 rounded-lg border border-dark-grey bg-light-warm-grey p-3 text-left transition-colors hover:bg-warm-grey focus:ring-2 focus:ring-red focus:ring-offset-2 focus:outline-none"
>
	<span class="flex h-9 shrink-0 items-center text-red">
		<ChartTypeGraphic chartType={selectedType.value} />
	</span>
	<span class="min-w-0 flex-1">
		<strong class="block font-sans text-sm leading-sm font-semibold text-dark-grey">
			{selectedGuidance?.label ?? selectedType.label}
		</strong>
		<span class="mt-1 block text-xs leading-xs text-mid-grey">
			{selectedGuidance?.purpose ?? ''}
		</span>
	</span>
	<span class="shrink-0 font-space text-xxs font-medium uppercase tracking-wider text-dark-grey">
		{expanded ? 'Close' : 'Change'}
	</span>
</button>

{#if expanded}
	<div id="chart-type-options" class="mt-2 grid grid-cols-2 gap-2">
		{#each CHART_TYPES as type (type.value)}
			{@const guidance = CHART_TYPE_GUIDANCE[type.value]}
			<button
				type="button"
				onclick={() => selectChartType(type.value)}
				aria-pressed={project.chartType === type.value}
				class="min-h-28 rounded-lg border p-3 text-left transition-colors focus:ring-2 focus:ring-red focus:ring-offset-2 focus:outline-none {project.chartType ===
				type.value
					? 'border-dark-grey bg-light-warm-grey'
					: 'border-warm-grey bg-white hover:border-mid-grey hover:bg-light-warm-grey'}"
			>
				<span class="mb-2 block h-9 text-red">
					<ChartTypeGraphic chartType={type.value} />
				</span>
				<strong class="block font-sans text-xs leading-xs font-semibold text-dark-grey">
					{guidance?.label ?? type.label}
				</strong>
				<span class="mt-1 block text-xxs leading-snug text-mid-grey">
					{guidance?.purpose ?? ''}
				</span>
			</button>
		{/each}
	</div>
{/if}
